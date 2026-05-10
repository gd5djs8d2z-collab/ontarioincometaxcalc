/**
 * calculator.js — OntarioIncomeTaxCalc.ca Calculation Engine
 * Reads exclusively from TAX_CONFIG (js/config.js).
 * Zero hardcoded rates, thresholds, or dollar amounts in this file.
 *
 * All formulas derived from CRA T4032-ON and CRA published methodology.
 */
(function () {
  "use strict";

  const C = TAX_CONFIG;

  // ── Utility ────────────────────────────────────────────────────────────────

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function fmt(n) {
    return "$" + round2(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function fmtPct(r) {
    return (r * 100).toFixed(1) + "%";
  }

  // ── Federal BPA (with phase-down for high incomes) ─────────────────────────
  // Above bpaPhaseoutStart, the additional BPA amount phases out linearly
  // reaching bpaBase at bpaPhaseoutEnd. Below phaseout: full bpa applies.

  function getFederalBPA(grossIncome) {
    const f = C.federal;
    if (grossIncome <= f.bpaPhaseoutStart) return f.bpa;
    if (grossIncome >= f.bpaPhaseoutEnd) return f.bpaBase;
    const fraction = (grossIncome - f.bpaPhaseoutStart) / (f.bpaPhaseoutEnd - f.bpaPhaseoutStart);
    return f.bpa - fraction * f.bpaAdditional;
  }

  // ── Progressive Bracket Calculator ────────────────────────────────────────
  // Returns { totalTax, bracketRows, marginalRate }
  // bracketRows: array of { min, max, rate, incomeInBracket, taxInBracket, cumulative }

  function calcBracketTax(taxableIncome, brackets) {
    let total = 0;
    let marginalRate = brackets[0].rate;
    const rows = [];

    for (let i = 0; i < brackets.length; i++) {
      const b = brackets[i];
      if (taxableIncome <= b.min) {
        rows.push({ min: b.min, max: b.max, rate: b.rate, incomeInBracket: 0, taxInBracket: 0, cumulative: total });
        continue;
      }
      const upper = Math.min(taxableIncome, b.max === Infinity ? taxableIncome : b.max);
      const incomeInBracket = Math.max(0, upper - b.min);
      const taxInBracket = incomeInBracket * b.rate;
      total += taxInBracket;
      if (incomeInBracket > 0) marginalRate = b.rate;
      rows.push({ min: b.min, max: b.max, rate: b.rate, incomeInBracket: incomeInBracket, taxInBracket: taxInBracket, cumulative: total });
    }

    return { totalTax: round2(total), bracketRows: rows, marginalRate: marginalRate };
  }

  // ── CPP Calculation ────────────────────────────────────────────────────────
  // CPP1: on (income - basicExemption) up to YMPE, at rate1
  // CPP2: on income between YMPE and YAMPE, at rate2
  // Both capped at their respective maxContribution values

  function calcCPP(grossIncome) {
    const cpp = C.cpp;
    const cpp1Base = Math.max(0, Math.min(grossIncome, cpp.ympe) - cpp.basicExemption);
    const cpp1 = round2(Math.min(cpp1Base * cpp.rate1, cpp.maxContribution1));

    const cpp2Base = Math.max(0, Math.min(grossIncome, cpp.yampe) - cpp.ympe);
    const cpp2 = round2(Math.min(cpp2Base * cpp.rate2, cpp.maxContribution2));

    return { cpp1, cpp2, total: round2(cpp1 + cpp2) };
  }

  // ── EI Calculation ────────────────────────────────────────────────────────
  function calcEI(grossIncome) {
    const ei = C.ei;
    const insurable = Math.min(grossIncome, ei.maxInsurableEarnings);
    return round2(Math.min(insurable * ei.rate, ei.maxPremium));
  }

  // ── Ontario Health Premium ─────────────────────────────────────────────────
  function calcOHP(grossIncome) {
    const bands = C.ohp;
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i];
      if (grossIncome >= b.min && (b.max === Infinity || grossIncome < b.max)) {
        if (b.marginalRate === 0) return round2(b.fixed);
        return round2(Math.min(b.fixed + (grossIncome - b.marginalBase) * b.marginalRate, b.cap));
      }
    }
    return 0;
  }

  // ── Ontario Surtax ────────────────────────────────────────────────────────
  // Applied to basic Ontario tax — NOT to income
  // Two-tier: 20% on basicOntarioTax above threshold1 + 36% on basicOntarioTax above threshold2

  function calcSurtax(basicOntarioTax) {
    const st = C.ontario.surtax;
    const tier1 = Math.max(0, basicOntarioTax - st.threshold1) * st.rate1;
    const tier2 = Math.max(0, basicOntarioTax - st.threshold2) * st.rate2;
    return round2(tier1 + tier2);
  }

  // ── BPA Credit ────────────────────────────────────────────────────────────
  // Non-refundable: credit = BPA × creditRate
  // Reduces tax payable (cannot make tax negative)

  function federalBPACredit(grossIncome) {
    return round2(getFederalBPA(grossIncome) * C.federal.creditRate);
  }

  function ontarioBPACredit() {
    return round2(C.ontario.bpa * C.ontario.creditRate);
  }

  // ── CPP/EI Non-Refundable Credits ─────────────────────────────────────────
  // CPP1 and EI generate credits at the federal and Ontario lowest bracket rates
  // CPP2 does NOT generate a non-refundable tax credit

  function federalCPP1Credit(cpp1) {
    return round2(cpp1 * C.federal.creditRate);
  }

  function federalEICredit(ei) {
    return round2(ei * C.federal.creditRate);
  }

  function ontarioCPP1Credit(cpp1) {
    return round2(cpp1 * C.ontario.creditRate);
  }

  function ontarioEICredit(ei) {
    return round2(ei * C.ontario.creditRate);
  }

  // ── Full Tax Calculation ───────────────────────────────────────────────────

  function calculate(grossIncome) {
    if (isNaN(grossIncome) || grossIncome < 0) {
      return { error: "INVALID_INCOME" };
    }

    // ── CPP and EI ──
    const cppResult = calcCPP(grossIncome);
    const ei = calcEI(grossIncome);

    // ── Taxable income adjustments ──
    // CPP1 and EI are deductible for income tax purposes (CPP2 is not deductible)
    const taxableIncome = Math.max(0, grossIncome - cppResult.cpp1 - ei);

    // ── Federal tax ──
    const fedBracket = calcBracketTax(taxableIncome, C.federal.brackets);
    const fedBPACredit = federalBPACredit(grossIncome);
    const fedCPP1Credit = federalCPP1Credit(cppResult.cpp1);
    const fedEICredit = federalEICredit(ei);
    const grossFederalTax = fedBracket.totalTax;
    const federalTax = round2(Math.max(0, grossFederalTax - fedBPACredit - fedCPP1Credit - fedEICredit));

    // ── Ontario tax ──
    const onBracket = calcBracketTax(taxableIncome, C.ontario.brackets);
    const onBPACredit = ontarioBPACredit();
    const onCPP1Credit = ontarioCPP1Credit(cppResult.cpp1);
    const onEICredit = ontarioEICredit(ei);
    const basicOntarioTax = round2(Math.max(0, onBracket.totalTax - onBPACredit - onCPP1Credit - onEICredit));
    const surtax = calcSurtax(basicOntarioTax);
    const totalOntarioTax = round2(basicOntarioTax + surtax);

    // ── OHP ──
    const ohp = calcOHP(grossIncome);

    // ── Totals ──
    const totalTax = round2(federalTax + totalOntarioTax);
    const totalDeductions = round2(federalTax + totalOntarioTax + ohp + cppResult.total + ei);
    const netIncome = round2(Math.max(0, grossIncome - totalDeductions));
    const effectiveRate = grossIncome > 0 ? round2((totalTax / grossIncome) * 10000) / 100 : 0;

    // ── BPA amounts for display ──
    const federalBPA = round2(getFederalBPA(grossIncome));
    const federalBPACreditDisplay = round2(federalBPA * C.federal.creditRate);
    const ontarioBPACreditDisplay = ontarioBPACredit();

    // ── $1,000 raise marginal illustration ──
    const raiseAmount = 1000;
    const marginalFedIncrease = round2(raiseAmount * fedBracket.marginalRate);
    const marginalOnIncrease = round2(raiseAmount * onBracket.marginalRate);
    const marginalTotal = round2(marginalFedIncrease + marginalOnIncrease);

    return {
      // inputs
      grossIncome: grossIncome,
      taxableIncome: taxableIncome,
      taxYear: C.taxYear,

      // federal
      federalBPA: federalBPA,
      federalBPACredit: federalBPACreditDisplay,
      federalCPP1Credit: fedCPP1Credit,
      federalEICredit: fedEICredit,
      grossFederalTax: grossFederalTax,
      federalTax: federalTax,
      federalBracketRows: fedBracket.bracketRows,
      marginalFederalRate: fedBracket.marginalRate,

      // ontario
      ontarioBPA: C.ontario.bpa,
      ontarioBPACredit: ontarioBPACreditDisplay,
      ontarioCPP1Credit: onCPP1Credit,
      ontarioEICredit: onEICredit,
      basicOntarioTax: basicOntarioTax,
      surtax: surtax,
      surtaxApplies: surtax > 0,
      totalOntarioTax: totalOntarioTax,
      ontarioBracketRows: onBracket.bracketRows,
      marginalOntarioRate: onBracket.marginalRate,

      // ohp
      ohp: ohp,

      // cpp
      cpp1: cppResult.cpp1,
      cpp2: cppResult.cpp2,
      cppTotal: cppResult.total,

      // ei
      ei: ei,

      // totals
      totalTax: totalTax,
      totalDeductions: totalDeductions,
      netIncome: netIncome,
      effectiveRate: effectiveRate,

      // marginal illustration
      marginalFedIncrease: marginalFedIncrease,
      marginalOnIncrease: marginalOnIncrease,
      marginalTotal: marginalTotal,
      raiseAmount: raiseAmount,

      // display helpers
      fmt: fmt,
      fmtPct: fmtPct
    };
  }

  // ── Expose ─────────────────────────────────────────────────────────────────
  window.OntarioTaxCalc = {
    calculate,
    calcBracketTax,
    calcCPP,
    calcEI,
    calcOHP,
    calcSurtax,
    getFederalBPA,
    federalBPACredit,
    ontarioBPACredit,
    fmt,
    fmtPct
  };

})();
