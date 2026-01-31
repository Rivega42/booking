// State
let config = {};
let slots = [];
let selectedDate = null;
let selectedSlot = null;
let currentMonthOffset = 0;

// DOM elements
const loading = document.getElementById('loading');

// Month names
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
const dayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// Initialize
async function init() {
  showLoading();
  try {
    // Load config
    const configRes = await fetch('/api/config');
    config = await configRes.json();
    
    // Update UI with config
    document.getElementById('owner-name').textContent = config.ownerName;
    document.getElementById('timezone').textContent = config.timezone || 'UTC';
    document.getElementById('duration').textContent = `${config.slotDuration || 30} min`;
    
    // Create avatar with initials
    const initials = config.ownerName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    document.getElementById('avatar').textContent = initials;
    
    // Load slots
    const slotsRes = await fetch('/api/slots');
    const data = await slotsRes.json();
    slots = data.slots || [];
    
    // Render calendar
    renderCalendar();
    
    // Setup event listeners
    setupEventListeners();
  } catch (error) {
    console.error('Failed to initialize:', error);
    alert('Error loading booking system. Please refresh the page.');
  }
  hideLoading();
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('prev-month').addEventListener('click', () => {
    if (currentMonthOffset > 0) {
      currentMonthOffset--;
      renderCalendar();
    }
  });
  
  document.getElementById('next-month').addEventListener('click', () => {
    if (currentMonthOffset < 2) {
      currentMonthOffset++;
      renderCalendar();
    }
  });
  
  document.getElementById('back-to-calendar').addEventListener('click', () => {
    showStep('calendar-view');
    selectedDate = null;
  });
  
  document.getElementById('back-to-slots').addEventListener('click', () => {
    showStep('slots-view');
    selectedSlot = null;
  });
  
  document.getElementById('booking-form').addEventListener('submit', handleFormSubmit);
}

// Render calendar
function renderCalendar() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const month = new Date(now.getFullYear(), now.getMonth() + currentMonthOffset, 1);
  
  // Update month title
  document.getElementById('month-title').textContent = 
    `${monthNames[month.getMonth()]} ${month.getFullYear()}`;
  
  // Enable/disable navigation buttons
  document.getElementById('prev-month').disabled = currentMonthOffset <= 0;
  document.getElementById('next-month').disabled = currentMonthOffset >= 2;
  
  // Get available dates
  const availableDates = new Set();
  slots.forEach(slot => {
    const d = new Date(slot.start);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    availableDates.add(key);
  });
  
  // Build calendar HTML
  let html = '';
  
  // Day labels
  dayLabels.forEach(day => {
    html += `<div class="day-label">${day}</div>`;
  });
  
  // Calculate first day (Monday = 0)
  let firstDay = month.getDay() - 1;
  if (firstDay < 0) firstDay = 6;
  
  // Empty cells before month starts
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day empty"></div>';
  }
  
  // Days of the month
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const isPast = date < today;
    const hasSlots = availableDates.has(dateKey);
    
    let classes = 'calendar-day';
    let onclick = '';
    
    if (isPast || !hasSlots) {
      classes += ' disabled';
    } else {
      classes += ' available';
      onclick = `onclick="selectDate('${date.toISOString()}')"`;
    }
    
    html += `<div class="${classes}" ${onclick}>${day}</div>`;
  }
  
  document.getElementById('calendar-grid').innerHTML = html;
}

// Select date
function selectDate(dateStr) {
  selectedDate = new Date(dateStr);
  
  // Filter slots for selected date
  const daySlots = slots.filter(slot => {
    const d = new Date(slot.start);
    return d.getDate() === selectedDate.getDate() &&
           d.getMonth() === selectedDate.getMonth() &&
           d.getFullYear() === selectedDate.getFullYear();
  });
  
  // Sort slots by time
  daySlots.sort((a, b) => new Date(a.start) - new Date(b.start));
  
  // Render time slots
  const container = document.getElementById('slots-container');
  container.innerHTML = daySlots.map(slot => {
    const time = new Date(slot.start).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `<div class="time-slot" onclick="selectSlot('${slot.start}')">${time}</div>`;
  }).join('');
  
  // Update display date
  const dateDisplay = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  document.getElementById('selected-date-display').textContent = dateDisplay;
  
  // Show slots view
  showStep('slots-view');
}

// Select time slot
function selectSlot(slotStart) {
  selectedSlot = slotStart;
  
  // Format datetime
  const datetime = new Date(slotStart).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  
  document.getElementById('selected-slot-info').innerHTML = `
    <strong>📅 ${datetime}</strong>
  `;
  
  // Show form
  showStep('form-view');
}

// Handle form submit
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const topic = document.getElementById('topic').value.trim();
  
  if (!name || !email || !selectedSlot) {
    alert('Please fill in all required fields');
    return;
  }
  
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Scheduling...</span>';
  
  showLoading();
  
  try {
    const res = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        email, 
        topic, 
        slot: selectedSlot 
      }),
    });
    
    const data = await res.json();
    
    if (data.success) {
      // Format event time
      const eventTime = new Date(data.event.start).toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      
      // Show success
      document.getElementById('event-details').innerHTML = `
        <strong>🕐 ${eventTime}</strong>
        <p style="margin-top: 0.5rem;">
          <a href="${data.event.link}" target="_blank">
            Add to Google Calendar →
          </a>
        </p>
      `;
      
      showStep('success-view');
    } else {
      alert(data.error || 'Booking failed. Please try again.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Schedule Event</span>';
    }
  } catch (error) {
    console.error('Booking failed:', error);
    alert('Network error. Please try again.');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Schedule Event</span>';
  }
  
  hideLoading();
}

// Show step
function showStep(stepId) {
  document.querySelectorAll('.booking-step').forEach(el => {
    el.classList.remove('active');
  });
  document.getElementById(stepId).classList.add('active');
}

// Loading helpers
function showLoading() {
  loading.classList.remove('hidden');
}

function hideLoading() {
  loading.classList.add('hidden');
}

// Start
init();
