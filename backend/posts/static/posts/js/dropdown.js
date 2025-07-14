// Dropdown Menu Functionality
document.addEventListener('DOMContentLoaded', function() {
  const userMenu = document.getElementById('userMenu');
  const userGreeting = userMenu?.querySelector('.user-greeting');
  
  if (!userMenu || !userGreeting) return;

  // Toggle dropdown when clicking on greeting
  userGreeting.addEventListener('click', function(e) {
    e.stopPropagation();
    userMenu.classList.toggle('open');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!userMenu.contains(e.target)) {
      userMenu.classList.remove('open');
    }
  });

  // Close dropdown when pressing Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      userMenu.classList.remove('open');
    }
  });

  // Prevent dropdown from closing when clicking inside it
  const dropdown = userMenu.querySelector('.dropdown');
  if (dropdown) {
    dropdown.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
});