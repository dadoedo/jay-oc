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
    const action = input.action || 'analytics';
    let result;
    
    switch (action) {
      case 'analytics':
        result = await runAnalytics(apiKeyResult.key, input, apiKeyResult.project);
        break;
      case 'customer':
        result = await getCustomer(apiKeyResult.key, input, apiKeyResult.project);
        break;
      case 'subscription':
        result = await getSubscription(apiKeyResult.key, input, apiKeyResult.project);
        break;
      case 'invoices':
        result = await getCustomerInvoices(apiKeyResult.key, input, apiKeyResult.project);
        break;
      case 'events':
        result = await getCustomerEvents(apiKeyResult.key, input, apiKeyResult.project);
        break;
      case 'raw':
        result = await rawApiCall(apiKeyResult.key, input, apiKeyResult.project);
        break;
      default:
        result = {
          status: 'error',
          error_type: 'invalid_action',
          message: `Unknown action: ${action}. Supported: analytics, customer, subscription, invoices, events, raw`,
          supported_actions: ['analytics', 'customer', 'subscription', 'invoices', 'events', 'raw']
        };
    }
    
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

// Get specific customer details
async function getCustomer(apiKey, input, projectName) {
  const startTime = Date.now();
  
  if (!input.customer_id && !input.email) {
    return {
      status: 'error',
      error_type: 'missing_parameter',
      message: 'Required: customer_id (cus_xxx) or email'
    };
  }
  
  let customer;
  
  if (input.customer_id) {
    // Fetch by ID
    const response = await fetch(`${STRIPE_API}/customers/${input.customer_id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT)
    });
    
    if (!response.ok) {
      return {
        status: 'error',
        error_type: 'not_found',
        message: `Customer not found: ${input.customer_id}`
      };
    }
    
    customer = await response.json();
  } else {
    // Search by email using list with email filter
    const params = new URLSearchParams({ email: input.email, limit: '5' });
    const response = await fetch(`${STRIPE_API}/customers?${params}`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT)
    });
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.data || data.data.length === 0) {
      return {
        status: 'error',
        error_type: 'not_found',
        message: `No customer found with email: ${input.email}`
      };
    }
    
    customer = data.data[0];
  }
  
  // Fetch related data in parallel
  const [subscriptions, invoices, paymentMethods] = await Promise.all([
    fetchStripeList(apiKey, `customers/${customer.id}/subscriptions`, 10),
    fetchStripeList(apiKey, `customers/${customer.id}/invoices`, 10),
    fetchStripeList(apiKey, `customers/${customer.id}/payment_methods`, 5)
  ]);
  
  const executionTime = Date.now() - startTime;
  
  return {
    status: 'success',
    action: 'customer',
    project: projectName,
    data: {
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        description: customer.description,
        phone: customer.phone,
        address: customer.address,
        balance: customer.balance,
        currency: customer.currency,
        created: new Date(customer.created * 1000).toISOString(),
        metadata: customer.metadata
      },
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        status: s.status,
        plan: s.items?.data?.[0]?.price?.nickname || 'Unknown',
        amount: s.items?.data?.[0]?.price?.unit_amount,
        currency: s.currency,
        current_period_start: s.current_period_start ? new Date(s.current_period_start * 1000).toISOString() : null,
        current_period_end: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: s.cancel_at_period_end,
        canceled_at: s.canceled_at ? new Date(s.canceled_at * 1000).toISOString() : null,
        trial_start: s.trial_start ? new Date(s.trial_start * 1000).toISOString() : null,
        trial_end: s.trial_end ? new Date(s.trial_end * 1000).toISOString() : null
      })),
      invoices: invoices.map(i => ({
        id: i.id,
        status: i.status,
        amount_due: i.amount_due,
        amount_paid: i.amount_paid,
        currency: i.currency,
        created: i.created ? new Date(i.created * 1000).toISOString() : null,
        period_start: i.period_start ? new Date(i.period_start * 1000).toISOString() : null,
        period_end: i.period_end ? new Date(i.period_end * 1000).toISOString() : null,
        pdf_url: i.invoice_pdf,
        hosted_invoice_url: i.hosted_invoice_url
      })),
      payment_methods: paymentMethods.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year
        } : null
      }))
    },
    metadata: {
      execution_time_ms: executionTime,
      api_calls: 4
    }
  };
}

// Get specific subscription details
async function getSubscription(apiKey, input, projectName) {
  const startTime = Date.now();
  
  if (!input.subscription_id) {
    return {
      status: 'error',
      error_type: 'missing_parameter',
      message: 'Required: subscription_id (sub_xxx)'
    };
  }
  
  const response = await fetch(`${STRIPE_API}/subscriptions/${input.subscription_id}`, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT)
  });
  
  if (!response.ok) {
    return {
      status: 'error',
      error_type: 'not_found',
      message: `Subscription not found: ${input.subscription_id}`
    };
  }
  
  const subscription = await response.json();
  
  // Get upcoming invoice if active
  let upcomingInvoice = null;
  if (subscription.status === 'active') {
    try {
      const uiResponse = await fetch(`${STRIPE_API}/invoices/upcoming?customer=${subscription.customer}&subscription=${subscription.id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT)
      });
      if (uiResponse.ok) {
        upcomingInvoice = await uiResponse.json();
      }
    } catch (e) {
      // Ignore errors for upcoming invoice
    }
  }
  
  const executionTime = Date.now() - startTime;
  
  return {
    status: 'success',
    action: 'subscription',
    project: projectName,
    data: {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        customer: subscription.customer,
        items: subscription.items?.data?.map(item => ({
          id: item.id,
          price: {
            id: item.price?.id,
            nickname: item.price?.nickname,
            unit_amount: item.price?.unit_amount,
            currency: item.price?.currency,
            recurring: item.price?.recurring
          },
          quantity: item.quantity
        })),
        current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
        current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
        collection_method: subscription.collection_method,
        days_until_due: subscription.days_until_due,
        default_payment_method: subscription.default_payment_method,
        latest_invoice: subscription.latest_invoice,
        metadata: subscription.metadata
      },
      upcoming_invoice: upcomingInvoice ? {
        amount_due: upcomingInvoice.amount_due,
        currency: upcomingInvoice.currency,
        period_start: upcomingInvoice.period_start ? new Date(upcomingInvoice.period_start * 1000).toISOString() : null,
        period_end: upcomingInvoice.period_end ? new Date(upcomingInvoice.period_end * 1000).toISOString() : null,
        next_payment_attempt: upcomingInvoice.next_payment_attempt ? new Date(upcomingInvoice.next_payment_attempt * 1000).toISOString() : null
      } : null
    },
    metadata: {
      execution_time_ms: executionTime,
      api_calls: upcomingInvoice ? 2 : 1
    }
  };
}

// Get customer invoices
async function getCustomerInvoices(apiKey, input, projectName) {
  const startTime = Date.now();
  
  if (!input.customer_id) {
    return {
      status: 'error',
      error_type: 'missing_parameter',
      message: 'Required: customer_id (cus_xxx)'
    };
  }
  
  const limit = Math.min(input.limit || 20, 100);
  const status = input.status; // draft, open, paid, uncollectible, void
  
  let url = `${STRIPE_API}/invoices?customer=${input.customer_id}&limit=${limit}`;
  if (status) url += `&status=${status}`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT)
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  const executionTime = Date.now() - startTime;
  
  return {
    status: 'success',
    action: 'invoices',
    project: projectName,
    data: {
      customer_id: input.customer_id,
      count: data.data.length,
      has_more: data.has_more,
      invoices: data.data.map(i => ({
        id: i.id,
        status: i.status,
        number: i.number,
        amount_due: i.amount_due,
        amount_paid: i.amount_paid,
        amount_remaining: i.amount_remaining,
        currency: i.currency,
        created: new Date(i.created * 1000).toISOString(),
        due_date: i.due_date ? new Date(i.due_date * 1000).toISOString() : null,
        period_start: new Date(i.period_start * 1000).toISOString(),
        period_end: new Date(i.period_end * 1000).toISOString(),
        pdf_url: i.invoice_pdf,
        hosted_invoice_url: i.hosted_invoice_url,
        subscription: i.subscription,
        description: i.description,
        metadata: i.metadata
      }))
    },
    metadata: {
      execution_time_ms: executionTime,
      api_calls: 1
    }
  };
}

// Get customer events
async function getCustomerEvents(apiKey, input, projectName) {
  const startTime = Date.now();
  
  if (!input.customer_id) {
    return {
      status: 'error',
      error_type: 'missing_parameter',
      message: 'Required: customer_id (cus_xxx)'
    };
  }
  
  const limit = Math.min(input.limit || 20, 100);
  const type = input.type; // Optional: filter by event type
  
  let url = `${STRIPE_API}/events?limit=${limit}`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT)
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Filter events related to this customer
  const customerEvents = data.data.filter(event => {
    const obj = event.data?.object;
    return obj?.customer === input.customer_id || 
           obj?.id === input.customer_id ||
           JSON.stringify(event).includes(input.customer_id);
  });
  
  const executionTime = Date.now() - startTime;
  
  return {
    status: 'success',
    action: 'events',
    project: projectName,
    data: {
      customer_id: input.customer_id,
      count: customerEvents.length,
      events: customerEvents.map(e => ({
        id: e.id,
        type: e.type,
        created: new Date(e.created * 1000).toISOString(),
        api_version: e.api_version,
        data: e.data
      }))
    },
    metadata: {
      execution_time_ms: executionTime,
      api_calls: 1,
      total_events_checked: data.data.length
    }
  };
}

// Raw API call for any Stripe endpoint
async function rawApiCall(apiKey, input, projectName) {
  const startTime = Date.now();
  
  if (!input.endpoint) {
    return {
      status: 'error',
      error_type: 'missing_parameter',
      message: 'Required: endpoint (e.g., "customers", "charges/ch_xxx", "subscriptions")'
    };
  }
  
  // Build URL with query params
  let url = `${STRIPE_API}/${input.endpoint}`;
  if (input.params) {
    const params = new URLSearchParams(input.params);
    url += `?${params}`;
  }
  
  const method = input.method || 'GET';
  const body = input.body ? JSON.stringify(input.body) : undefined;
  
  const response = await fetch(url, {
    method,
    headers: { 
      'Authorization': `Bearer ${apiKey}`, 
      'Content-Type': 'application/json'
    },
    body,
    signal: AbortSignal.timeout(TIMEOUT)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    return {
      status: 'error',
      error_type: 'api_error',
      message: `Stripe API error: ${response.status}`,
      details: errorText
    };
  }
  
  const data = await response.json();
  
  const executionTime = Date.now() - startTime;
  
  return {
    status: 'success',
    action: 'raw',
    project: projectName,
    data: {
      endpoint: input.endpoint,
      method,
      response: data
    },
    metadata: {
      execution_time_ms: executionTime,
      api_calls: 1
    }
  };
}

// Helper to fetch a list from Stripe
async function fetchStripeList(apiKey, endpoint, limit = 10) {
  const url = `${STRIPE_API}/${endpoint}?limit=${limit}`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT)
  });
  
  if (!response.ok) {
    return [];
  }
  
  const data = await response.json();
  return data.data || [];
}

main();
