// State
let config = {};
let slots = [];
let selectedDate = null;
let selectedSlot = null;

// DOM elements
const loading = document.getElementById('loading');

// Initialize
async function init() {
  showLoading();
  try {
    // Load config
    const configRes = await fetch('/api/config');
    config = await configRes.json();
    document.getElementById('owner-name').textContent = config.ownerName;
    
    // Load slots
    const slotsRes = await fetch('/api/slots');
    const data = await slotsRes.json();
    slots = data.slots;
    
    // Render calendar
    renderCalendar();
  } catch (error) {
    console.error('Failed to initialize:', error);
    alert('Ошибка загрузки. Попробуйте обновить страницу.');
  }
  hideLoading();
}

// Calendar rendering
function renderCalendar(offset = 0) {
  const calendar = document.getElementById('calendar');
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  
  // Get days with slots
  const daysWithSlots = new Set();
  slots.forEach(slot => {
    const d = new Date(slot.start);
    daysWithSlots.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  });
  
  let html = `
    <div class="calendar-nav" style="grid-column: span 7;">
      <button onclick="renderCalendar(${offset - 1})" ${offset <= 0 ? 'disabled' : ''}>←</button>
      <span class="calendar-month">${monthNames[month.getMonth()]} ${month.getFullYear()}</span>
      <button onclick="renderCalendar(${offset + 1})" ${offset >= 1 ? 'disabled' : ''}>→</button>
    </div>
  `;
  
  // Day headers
  dayNames.forEach(day => {
    html += `<div class="calendar-header">${day}</div>`;
  });
  
  // First day offset (Monday = 0)
  let firstDay = month.getDay() - 1;
  if (firstDay < 0) firstDay = 6;
  
  // Empty cells
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day empty"></div>';
  }
  
  // Days
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const hasSlots = daysWithSlots.has(key);
    const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let classes = 'calendar-day';
    if (isPast || !hasSlots) classes += ' disabled';
    if (hasSlots && !isPast) classes += ' has-slots';
    
    const onclick = hasSlots && !isPast ? `selectDate('${date.toISOString()}')` : '';
    html += `<div class="${classes}" onclick="${onclick}">${day}</div>`;
  }
  
  calendar.innerHTML = html;
}

// Select date
function selectDate(dateStr) {
  selectedDate = new Date(dateStr);
  
  // Filter slots for this date
  const daySlots = slots.filter(slot => {
    const d = new Date(slot.start);
    return d.getDate() === selectedDate.getDate() &&
           d.getMonth() === selectedDate.getMonth() &&
           d.getFullYear() === selectedDate.getFullYear();
  });
  
  // Render time slots
  const container = document.getElementById('time-slots');
  container.innerHTML = daySlots.map(slot => {
    const time = new Date(slot.start).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `<div class="time-slot" onclick="selectSlot('${slot.start}')">${time}</div>`;
  }).join('');
  
  // Update header
  const dateStr2 = selectedDate.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  document.getElementById('selected-date').textContent = `(${dateStr2})`;
  
  // Show step
  showStep('time');
}

// Select time slot
function selectSlot(slotStart) {
  selectedSlot = slotStart;
  
  // Update display
  const datetime = new Date(slotStart).toLocaleString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
  document.getElementById('selected-slot-display').textContent = `📅 ${datetime}`;
  
  showStep('details');
}

// Go back
function goBack(step) {
  showStep(step);
}

// Show step
function showStep(step) {
  document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
  document.getElementById(`step-${step}`).classList.add('active');
}

// Form submit
document.getElementById('booking-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const topic = document.getElementById('topic').value.trim();
  
  if (!name || !email || !selectedSlot) {
    alert('Пожалуйста, заполните все обязательные поля');
    return;
  }
  
  showLoading();
  document.getElementById('submit-btn').disabled = true;
  
  try {
    const res = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, topic, slot: selectedSlot }),
    });
    
    const data = await res.json();
    
    if (data.success) {
      const eventTime = new Date(data.event.start).toLocaleString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
      
      document.getElementById('event-details').innerHTML = `
        <p><strong>🕐 ${eventTime}</strong></p>
        <p style="margin-top: 0.5rem;">
          <a href="${data.event.link}" target="_blank" style="color: var(--primary);">
            Открыть в Google Calendar →
          </a>
        </p>
      `;
      
      showStep('success');
    } else {
      alert(data.error || 'Произошла ошибка. Попробуйте ещё раз.');
    }
  } catch (error) {
    console.error('Booking failed:', error);
    alert('Ошибка соединения. Попробуйте ещё раз.');
  }
  
  hideLoading();
  document.getElementById('submit-btn').disabled = false;
});

// Loading helpers
function showLoading() {
  loading.classList.remove('hidden');
}

function hideLoading() {
  loading.classList.add('hidden');
}

// Start
init();
