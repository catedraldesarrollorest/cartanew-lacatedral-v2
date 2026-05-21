function switchTab(tabName, btn) {
  // Remove active class from all tab content
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remove active class from all nav buttons
  document.querySelectorAll('.tab-nav-btn').forEach(b => {
    b.classList.remove('active');
  });

  // Add active class to selected tab and button
  document.getElementById(tabName + 'Tab').classList.add('active');
  btn.classList.add('active');
}
