(() => {
  const aside = document.querySelector('aside[role="dialog"]');
  const text = aside ? aside.innerText : '';
  const charts = aside ? [...aside.querySelectorAll('svg')].map((svg) => ({
    w: Math.round(svg.getBoundingClientRect().width),
    paths: svg.querySelectorAll('path').length,
  })) : [];
  return {
    drawerOpen: !!aside,
    sections: aside ? [...aside.querySelectorAll('h3')].map((h) => h.textContent) : [],
    hasLatencyTasks: text.includes('Telecom') || text.includes('Unicom'),
    latencyBlock: (text.match(/延迟监测[\s\S]{0,120}/) || [''])[0].replace(/\s+/g, ' '),
    charts,
    bodyLocked: getComputedStyle(document.body).overflow,
    hash: location.hash,
    errors: window.__errs || [],
  };
})()
