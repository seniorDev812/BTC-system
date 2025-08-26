const math = require('mathjs');

class OptionsCalculator {
  constructor() {
    this.riskFreeRate = 0.05; // 5% risk-free rate
  }

  // Calculate days to expiration
  calculateDTE(expirationDate) {
    const now = new Date();
    const expiry = new Date(expirationDate);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  // Calculate time to expiration in years
  calculateTimeToExpiry(expirationDate) {
    const dte = this.calculateDTE(expirationDate);
    return dte / 365;
  }

  // Standard normal cumulative distribution function
  normalCDF(x) {
    return 0.5 * (1 + math.erf(x / Math.sqrt(2)));
  }

  // Standard normal probability density function
  normalPDF(x) {
    return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
  }

  // Black-Scholes option pricing
  blackScholes(S, K, T, r, sigma, optionType) {
    if (T <= 0) {
      return optionType === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    }

    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);

    if (optionType === 'call') {
      return S * this.normalCDF(d1) - K * Math.exp(-r * T) * this.normalCDF(d2);
    } else {
      return K * Math.exp(-r * T) * this.normalCDF(-d2) - S * this.normalCDF(-d1);
    }
  }

  // Calculate option Greeks
  calculateGreeks(S, K, T, r, sigma, optionType) {
    if (T <= 0) {
      const intrinsic = optionType === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
      return {
        delta: optionType === 'call' ? (S > K ? 1 : 0) : (S < K ? -1 : 0),
        gamma: 0,
        theta: 0,
        vega: 0,
        rho: 0
      };
    }

    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);

    let delta, gamma, theta, vega, rho;

    if (optionType === 'call') {
      delta = this.normalCDF(d1);
      gamma = this.normalPDF(d1) / (S * sigma * Math.sqrt(T));
      theta = (-S * this.normalPDF(d1) * sigma / (2 * Math.sqrt(T))) - 
              (r * K * Math.exp(-r * T) * this.normalCDF(d2));
      vega = S * Math.sqrt(T) * this.normalPDF(d1);
      rho = K * T * Math.exp(-r * T) * this.normalCDF(d2);
    } else {
      delta = this.normalCDF(d1) - 1;
      gamma = this.normalPDF(d1) / (S * sigma * Math.sqrt(T));
      theta = (-S * this.normalPDF(d1) * sigma / (2 * Math.sqrt(T))) + 
              (r * K * Math.exp(-r * T) * this.normalCDF(-d2));
      vega = S * Math.sqrt(T) * this.normalPDF(d1);
      rho = -K * T * Math.exp(-r * T) * this.normalCDF(-d2);
    }

    return { delta, gamma, theta, vega, rho };
  }

  // Calculate implied volatility using Newton-Raphson method
  calculateImpliedVolatility(S, K, T, r, marketPrice, optionType, maxIterations = 100, tolerance = 1e-5) {
    if (T <= 0) {
      const intrinsic = optionType === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
      return intrinsic === marketPrice ? 0 : null;
    }

    let sigma = 0.5; // Initial guess
    let iteration = 0;

    while (iteration < maxIterations) {
      const price = this.blackScholes(S, K, T, r, sigma, optionType);
      const diff = marketPrice - price;

      if (Math.abs(diff) < tolerance) {
        return sigma;
      }

      const vega = this.calculateGreeks(S, K, T, r, sigma, optionType).vega;
      
      if (Math.abs(vega) < 1e-10) {
        break;
      }

      sigma = sigma + diff / vega;
      sigma = Math.max(0.001, sigma); // Ensure positive volatility

      iteration++;
    }

    return null; // Failed to converge
  }

  // Calculate option price and Greeks
  calculateOptionMetrics(option, currentPrice) {
    const S = currentPrice;
    const K = option.strikePrice;
    const T = this.calculateTimeToExpiry(option.expirationDate);
    const r = this.riskFreeRate;
    const optionType = option.contractType === 'call_option' ? 'call' : 'put';

    // Use market price if available, otherwise calculate theoretical
    const marketPrice = option.lastPrice || this.blackScholes(S, K, T, r, option.impliedVolatility || 0.5, optionType);
    
    const greeks = this.calculateGreeks(S, K, T, r, option.impliedVolatility || 0.5, optionType);
    
    return {
      price: marketPrice,
      intrinsic: optionType === 'call' ? Math.max(0, S - K) : Math.max(0, K - S),
      extrinsic: marketPrice - (optionType === 'call' ? Math.max(0, S - K) : Math.max(0, K - S)),
      greeks,
      dte: this.calculateDTE(option.expirationDate),
      timeToExpiry: T
    };
  }

  // Calculate strategy metrics for multi-leg positions
  calculateStrategyMetrics(strategy, currentPrice) {
    let totalDelta = 0;
    let totalGamma = 0;
    let totalTheta = 0;
    let totalVega = 0;
    let totalRho = 0;
    let totalCost = 0;
    let maxProfit = 0;
    let maxLoss = 0;
    let breakEvenPoints = [];

    // Calculate metrics for each leg
    const legs = strategy.legs.map(leg => {
      const metrics = this.calculateOptionMetrics(leg.option, currentPrice);
      const positionSize = leg.quantity * (leg.action === 'buy' ? 1 : -1);
      
      const legMetrics = {
        ...metrics,
        positionDelta: metrics.greeks.delta * positionSize,
        positionGamma: metrics.greeks.gamma * positionSize,
        positionTheta: metrics.greeks.theta * positionSize,
        positionVega: metrics.greeks.vega * positionSize,
        positionRho: metrics.greeks.rho * positionSize,
        positionCost: metrics.price * leg.quantity * (leg.action === 'buy' ? 1 : -1),
        quantity: leg.quantity,
        action: leg.action
      };

      totalDelta += legMetrics.positionDelta;
      totalGamma += legMetrics.positionGamma;
      totalTheta += legMetrics.positionTheta;
      totalVega += legMetrics.positionVega;
      totalRho += legMetrics.positionRho;
      totalCost += legMetrics.positionCost;

      return legMetrics;
    });

    // Calculate payoff at different price points
    const priceRange = this.calculatePayoffRange(strategy, currentPrice);
    const payoffData = priceRange.map(price => {
      const payoff = this.calculateStrategyPayoff(strategy, price);
      return { price, payoff };
    });

    // Find break-even points
    breakEvenPoints = this.findBreakEvenPoints(payoffData);

    // Calculate max profit and loss
    const payoffs = payoffData.map(p => p.payoff);
    maxProfit = Math.max(...payoffs);
    maxLoss = Math.min(...payoffs);

    return {
      legs,
      totalDelta,
      totalGamma,
      totalTheta,
      totalVega,
      totalRho,
      totalCost,
      maxProfit,
      maxLoss,
      breakEvenPoints,
      payoffData,
      currentPrice
    };
  }

  // Calculate payoff range for charting
  calculatePayoffRange(strategy, currentPrice) {
    const minStrike = Math.min(...strategy.legs.map(leg => leg.option.strikePrice));
    const maxStrike = Math.max(...strategy.legs.map(leg => leg.option.strikePrice));
    
    const range = Math.max(maxStrike - minStrike, currentPrice * 0.5);
    const start = Math.max(0, Math.min(minStrike, currentPrice) - range * 0.3);
    const end = Math.max(maxStrike, currentPrice) + range * 0.3;
    
    const points = [];
    const step = (end - start) / 100;
    
    for (let price = start; price <= end; price += step) {
      points.push(Math.round(price * 100) / 100);
    }
    
    return points;
  }

  // Calculate strategy payoff at a specific price
  calculateStrategyPayoff(strategy, price) {
    let totalPayoff = 0;

    strategy.legs.forEach(leg => {
      const option = leg.option;
      const quantity = leg.quantity;
      const action = leg.action === 'buy' ? 1 : -1;
      
      let legPayoff = 0;
      
      if (option.contractType === 'call_option') {
        legPayoff = Math.max(0, price - option.strikePrice);
      } else if (option.contractType === 'put_option') {
        legPayoff = Math.max(0, option.strikePrice - price);
      } else if (option.contractType === 'futures') {
        legPayoff = price - option.strikePrice;
      }
      
      totalPayoff += legPayoff * quantity * action;
    });

    return totalPayoff;
  }

  // Find break-even points
  findBreakEvenPoints(payoffData) {
    const breakEvenPoints = [];
    const epsilon = 1e-6;

    for (let i = 1; i < payoffData.length; i++) {
      const prev = payoffData[i - 1];
      const curr = payoffData[i];
      
      if ((prev.payoff <= 0 && curr.payoff >= 0) || 
          (prev.payoff >= 0 && curr.payoff <= 0)) {
        // Linear interpolation to find exact break-even point
        const denom = Math.abs(prev.payoff) + Math.abs(curr.payoff);
        if (denom < epsilon) {
          continue;
        }
        const ratio = Math.abs(prev.payoff) / denom;
        const breakEvenPrice = prev.price + ratio * (curr.price - prev.price);
        const price = Math.round(breakEvenPrice * 100) / 100;

        if (Number.isFinite(price)) {
          // Deduplicate close points
          const isDuplicate = breakEvenPoints.some(p => Math.abs(p - price) < 0.5);
          if (!isDuplicate) {
            breakEvenPoints.push(price);
          }
        }
      }
    }
    
    return breakEvenPoints;
  }

  // Calculate margin requirements (simplified)
  calculateMarginRequirement(strategy) {
    let totalMargin = 0;
    
    strategy.legs.forEach(leg => {
      if (leg.action === 'sell') {
        // Simplified margin calculation
        const option = leg.option;
        const margin = option.strikePrice * leg.quantity * 0.1; // 10% of strike
        totalMargin += margin;
      }
    });
    
    return totalMargin;
  }
}

module.exports = new OptionsCalculator();
