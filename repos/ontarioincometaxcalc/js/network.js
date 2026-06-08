// Related tools for the Ontario Income Tax Calculator footer
// Injected by network.js — single source of truth for related tools
(function() {
  var tools = [
    { name: 'Ontario Take-Home Pay Calculator', url: 'https://ontariotakehomecalc.ca/', desc: 'Net pay after all deductions' },
    { name: 'Ontario Bonus Tax Calculator', url: 'https://ontariobonustaxcalc.ca/', desc: 'Tax on bonus/lump-sum payments' },
    { name: 'Ontario Raise Calculator', url: 'https://ontarioraisecalc.ca/', desc: 'Tax impact of a salary increase' },
    { name: 'Ontario Marginal Tax Calculator', url: 'https://marginaltaxcalc.ca/', desc: 'Marginal vs effective rate comparison' },
    { name: 'Ontario Commission Tax Calculator', url: 'https://ontariocommissiontaxcalc.ca/', desc: 'Tax on commission payments' },
    { name: 'Ontario Severance Pay Calculator', url: 'https://ontarioseverancepaycalc.ca/', desc: 'Severance pay tax estimate' },
    { name: 'Ontario Termination Pay Calculator', url: 'https://ontarioterminationpaycalc.ca/', desc: 'Termination pay tax estimate' },
    { name: 'Ontario Self-Employed Tax Calculator', url: 'https://ontarioselfemployedtaxcalc.ca/', desc: 'Self-employment tax estimate' }
  ];

  var container = document.getElementById('related-tools');
  if (!container) return;

  var html = '';
  for (var i = 0; i < tools.length; i++) {
    html += '<a href="' + tools[i].url + '" rel="noopener">' + tools[i].name + '</a>';
  }
  container.innerHTML = html;
})();
