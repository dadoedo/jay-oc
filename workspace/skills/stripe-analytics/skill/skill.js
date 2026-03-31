#!/usr/bin/env node
/**
 * Stripe Analytics Skill
 * Read-only analytics dashboard for SaaS metrics
 */

const STRIPE_API = 'https://api.stripe.com/v1';
const TIMEOUT = parseInt(process.env.STRIPE_TIMEOUT || '8000', 10);

// Supported projects
const PROJECTS = ['skysnail', 'anderro', 'viralsky', 'foodient'];

// Get API key for project
function getApiKey(project) {
  // If project specified, use project-specific key
  if (project) {
    const projectKey = process.env[`STRIPE_${project.toUpperCase()}_READ_KEY`];
    if (projectKey) return { key: projectKey, project };
    return { error: `STRIPE_${project.toUpperCase()}_READ_KEY not found` };
  }
  
  // Find all available keys
  const availableKeys = [];
  
  // Check legacy/default key
  if (process.env.STRIPE_READ_KEY) {
    availableKeys.push({ key: process.env.STRIPE_READ_KEY, project: 'default' });
  }
  
  // Check project-specific keys
  for (const proj of PROJECTS) {
    const key = process.env[`STRIPE_${proj.toUpperCase()}_READ_KEY`];
    if (key) {
      availableKeys.push({ key, project: proj });
    }
  }
  
  // If only one key exists, use it
  if (availableKeys.length === 1) {
    return availableKeys[0];
  }
  
  // If multiple keys exist, require explicit project
  if (availableKeys.length > 1) {
    const projects = availableKeys.map(k => k.project).join(', ');
    return { 
      error: `Multiple Stripe keys found (${projects}). Please specify "project": "name" in input`,
      available_projects: availableKeys.map(k => k.project)
    };
  }
  
  return { error: 'No Stripe API key found. Set STRIPE_READ_KEY or STRIPE_{PROJECT}_READ_KEY' };
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  const input = args[0] ? JSON.parse(args[0]) : {};
  
  const apiKeyResult = getApiKey(input.project);
  if (apiKeyResult.error) {
    console.log(JSON.stringify({
      status: 'error',
      error_type: 'auth_error',
      message: apiKeyResult.error,
      ...(apiKeyResult.available_projects && { available_projects: apiKeyResult.available_projects })
    }));
    process.exit(1);
  }

  try {
    const result = await runAnalytics(apiKeyResult.key, input, apiKeyResult.project);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.log(JSON.stringify({
      status: 'error',
      error_type: error.name === 'RateLimitError' ? 'rate_limit' : 'network_error',
      message: error.message
    }));
    process.exit(1);
  }
}

async function runAnalytics(apiKey, input, projectName = 'default') {
  const startTime = Date.now();
  const daysBack = Math.min(Math.max(input.days_back || 30, 7), 365);
  const segmentBy = input.segment_by || 'plan';
  const forecastMonths = Math.min(Math.max(input.forecast_months || 3, 1), 12);
  const customerLimit = Math.min(Math.max(input.customer_limit || 10, 1), 50);
  
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  
  // Fetch data in parallel
  const [customers, subscriptions, invoices] = await Promise.all([
    fetchAll(apiKey, 'customers', since),
    fetchAll(apiKey, 'subscriptions', since),
    fetchAll(apiKey, 'invoices', since)
  ]);
  
  // Calculate MRR
  const mrr = calculateMRR(subscriptions);
  const prevMrr = calculateMRR(subscriptions, daysBack * 2, daysBack);
  const mrrGrowth = prevMrr > 0 ? ((mrr - prevMrr) / prevMrr * 100).toFixed(1) : 0;
  
  // Calculate churn
  const churn = calculateChurn(subscriptions, daysBack);
  
  // Segment analysis
  const segments = analyzeSegments(subscriptions, customers, segmentBy);
  
  // Top customers by LTV
  const topCustomers = getTopCustomers(subscriptions, customers, customerLimit);
  
  // Forecast
  const forecast = generateForecast(mrr, mrrGrowth, forecastMonths);
  
  // Insights
  const insights = generateInsights(segments, mrrGrowth, churn);
  
  // Action items
  const actionItems = generateActionItems(churn, segments);
  
  const executionTime = Date.now() - startTime;
  
  return {
    status: 'success',
    data: {
      project: projectName,
      mrr: {
        current: Math.round(mrr),
        previous: Math.round(prevMrr),
        growth_pct: parseFloat(mrrGrowth)
      },
      churn: {
        revenue_pct: parseFloat(churn.revenuePct.toFixed(1)),
        customer_pct: parseFloat(churn.customerPct.toFixed(1)),
        at_risk: churn.atRisk
      },
      segments: segments,
      top_customers: topCustomers,
      forecast: forecast,
      insights: insights,
      action_items: actionItems,
      summary: {
        total_customers: customers.length,
        active_subscriptions: subscriptions.filter(s => s.status === 'active').length,
        period_days: daysBack
      }
    },
    metadata: {
      execution_time_ms: executionTime,
      api_calls: 3,
      data_points: customers.length + subscriptions.length + invoices.length
    }
  };
}

async function fetchAll(apiKey, endpoint, since) {
  const results = [];
  let hasMore = true;
  let startingAfter = null;
  
  while (hasMore && results.length < 10000) {
    const params = new URLSearchParams({
      limit: '100',
      ...(since && { 'created[gte]': Math.floor(since.getTime() / 1000) }),
      ...(startingAfter && { starting_after: startingAfter })
    });
    
    const response = await fetch(`${STRIPE_API}/${endpoint}?${params}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(TIMEOUT)
    });
    
    if (response.status === 429) {
      const err = new Error('Rate limit exceeded. Wait 60s or upgrade plan.');
      err.name = 'RateLimitError';
      throw err;
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    results.push(...(data.data || []));
    
    hasMore = data.has_more;
    if (hasMore && data.data.length > 0) {
      startingAfter = data.data[data.data.length - 1].id;
    }
  }
  
  return results;
}

function calculateMRR(subscriptions, totalDays = null, offsetDays = 0) {
  const now = new Date();
  const cutoff = totalDays ? new Date(now.getTime() - offsetDays * 24 * 60 * 60 * 1000) : now;
  
  let mrr = 0;
  
  for (const sub of subscriptions) {
    if (sub.status !== 'active' && sub.status !== 'trialing') continue;
    
    const items = sub.items?.data || [];
    for (const item of items) {
      const price = item.price;
      if (!price) continue;
      
      const amount = price.unit_amount || 0;
      const interval = price.recurring?.interval || 'month';
      const intervalCount = price.recurring?.interval_count || 1;
      
      let monthlyAmount = amount;
      if (interval === 'year') monthlyAmount = amount / 12;
      else if (interval === 'week') monthlyAmount = amount * 4.33;
      else if (interval === 'day') monthlyAmount = amount * 30;
      
      monthlyAmount /= intervalCount;
      mrr += monthlyAmount * (item.quantity || 1);
    }
  }
  
  return mrr / 100; // Convert from cents
}

function calculateChurn(subscriptions, daysBack) {
  const now = new Date();
  const periodStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const periodEnd = new Date(now.getTime() - (daysBack * 2) * 24 * 60 * 60 * 1000);
  
  let cancelledRevenue = 0;
  let cancelledCustomers = 0;
  let atRisk = 0;
  
  const activeAtStart = subscriptions.filter(sub => {
    const created = new Date(sub.created * 1000);
    return created < periodStart && (sub.status === 'active' || sub.status === 'trialing');
  });
  
  const startingMrr = calculateMRR(activeAtStart);
  
  for (const sub of subscriptions) {
    if (sub.status === 'canceled' || sub.cancel_at_period_end) {
      const canceledAt = sub.canceled_at ? new Date(sub.canceled_at * 1000) : null;
      if (canceledAt && canceledAt >= periodStart) {
        cancelledCustomers++;
        // Estimate their contribution to MRR
        const items = sub.items?.data || [];
        for (const item of items) {
          const price = item.price;
          if (price) {
            cancelledRevenue += (price.unit_amount || 0) / 100;
          }
        }
      }
    }
    
    // At-risk: ending soon or past_due
    if (sub.cancel_at_period_end || sub.status === 'past_due') {
      atRisk++;
    }
  }
  
  return {
    revenuePct: startingMrr > 0 ? (cancelledRevenue / startingMrr) * 100 : 0,
    customerPct: activeAtStart.length > 0 ? (cancelledCustomers / activeAtStart.length) * 100 : 0,
    atRisk: atRisk
  };
}

function analyzeSegments(subscriptions, customers, segmentBy) {
  const segments = {};
  
  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue;
    
    const customer = customers.find(c => c.id === sub.customer);
    let key = 'Unknown';
    
    if (segmentBy === 'plan') {
      const item = sub.items?.data?.[0];
      key = item?.price?.nickname || item?.plan?.nickname || 'Default';
    } else if (segmentBy === 'geo') {
      key = customer?.address?.country || customer?.country || 'Unknown';
    } else if (segmentBy === 'industry') {
      key = customer?.metadata?.industry || 'Unknown';
    }
    
    if (!segments[key]) {
      segments[key] = { name: key, customers: 0, mrr: 0 };
    }
    
    segments[key].customers++;
    
    const items = sub.items?.data || [];
    for (const item of items) {
      const price = item.price;
      if (price) {
        let monthlyAmount = (price.unit_amount || 0) / 100;
        const interval = price.recurring?.interval || 'month';
        if (interval === 'year') monthlyAmount /= 12;
        else if (interval === 'week') monthlyAmount *= 4.33;
        segments[key].mrr += monthlyAmount * (item.quantity || 1);
      }
    }
  }
  
  return Object.values(segments)
    .map(s => ({
      name: s.name,
      customers: s.customers,
      mrr: Math.round(s.mrr),
      arpu: Math.round(s.mrr / s.customers)
    }))
    .sort((a, b) => b.mrr - a.mrr)
    .slice(0, 10);
}

function getTopCustomers(subscriptions, customers, limit) {
  const customerLTV = {};
  
  for (const sub of subscriptions) {
    const customerId = sub.customer;
    if (!customerLTV[customerId]) {
      const customer = customers.find(c => c.id === customerId);
      customerLTV[customerId] = {
        id: customerId,
        name: customer?.name || customer?.email || 'Unknown',
        email: customer?.email,
        ltv: 0,
        mrr: 0,
        status: sub.status
      };
    }
    
    const items = sub.items?.data || [];
    for (const item of items) {
      const price = item.price;
      if (price) {
        let monthlyAmount = (price.unit_amount || 0) / 100;
        customerLTV[customerId].mrr += monthlyAmount * (item.quantity || 1);
      }
    }
  }
  
  // Estimate LTV (MRR * 24 months as simple heuristic)
  for (const id in customerLTV) {
    customerLTV[id].ltv = Math.round(customerLTV[id].mrr * 24);
  }
  
  return Object.values(customerLTV)
    .sort((a, b) => b.ltv - a.ltv)
    .slice(0, limit);
}

function generateForecast(currentMrr, growthPct, months) {
  const forecast = [];
  let projectedMrr = currentMrr;
  const monthlyGrowth = growthPct / 100;
  
  for (let i = 0; i < months; i++) {
    projectedMrr = projectedMrr * (1 + monthlyGrowth);
    forecast.push(Math.round(projectedMrr));
  }
  
  return forecast;
}

function generateInsights(segments, mrrGrowth, churn) {
  const insights = [];
  
  if (mrrGrowth > 10) {
    insights.push(`Strong MRR growth at ${mrrGrowth}% MoM`);
  } else if (mrrGrowth < 0) {
    insights.push(`MRR declining by ${Math.abs(mrrGrowth)}% - investigate churn`);
  }
  
  if (churn.revenuePct > 5) {
    insights.push(`High revenue churn at ${churn.revenuePct.toFixed(1)}%`);
  }
  
  if (segments.length > 1) {
    const topSegment = segments[0];
    const secondSegment = segments[1];
    if (topSegment.arpu > secondSegment.arpu * 1.5) {
      insights.push(`${topSegment.name} ARPU is ${Math.round(topSegment.arpu / secondSegment.arpu)}x higher than ${secondSegment.name}`);
    }
  }
  
  if (insights.length === 0) {
    insights.push('Business metrics stable - no immediate action required');
  }
  
  return insights;
}

function generateActionItems(churn, segments) {
  const actions = [];
  
  if (churn.atRisk > 0) {
    actions.push({
      priority: 'high',
      action: 'Contact at-risk customers',
      impact: 'retention',
      details: `${churn.atRisk} customers at risk of churning`
    });
  }
  
  if (churn.revenuePct > 5) {
    actions.push({
      priority: 'high', 
      action: 'Implement churn reduction campaign',
      impact: 'revenue',
      details: `Revenue churn at ${churn.revenuePct.toFixed(1)}%`
    });
  }
  
  if (segments.length > 0) {
    const topSegment = segments[0];
    actions.push({
      priority: 'medium',
      action: `Expand ${topSegment.name} segment`,
      impact: 'growth',
      details: `Top segment with $${topSegment.mrr} MRR`
    });
  }
  
  return actions;
}

main();
