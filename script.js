/**
 * AeroCalc - Premium Web Calculator
 * Core Logic & UI Interaction
 */

// --- Loguru Style Beautiful Console Logger in JS ---
const Loguru = {
  getTimestamp() {
    const now = new Date();
    const pad = (num, size = 2) => String(num).padStart(size, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
  },
  
  info(msg, module = 'Main') {
    console.log(
      `%c${this.getTimestamp()} %c| %cINFO     %c| %c${module} %c- %c${msg}`,
      'color: #888;', 'color: #555;', 'color: #10b981; font-weight: bold;', 'color: #555;', 'color: #6366f1; font-weight: bold;', 'color: #555;', 'color: inherit;'
    );
  },

  warn(msg, module = 'Main') {
    console.warn(
      `%c${this.getTimestamp()} %c| %cWARNING  %c| %c${module} %c- %c${msg}`,
      'color: #888;', 'color: #555;', 'color: #f59e0b; font-weight: bold;', 'color: #555;', 'color: #6366f1; font-weight: bold;', 'color: #555;', 'color: #f59e0b;'
    );
  },

  error(msg, module = 'Main', err = '') {
    console.error(
      `%c${this.getTimestamp()} %c| %cERROR    %c| %c${module} %c- %c${msg} %c${err}`,
      'color: #888;', 'color: #555;', 'color: #ef4444; font-weight: bold;', 'color: #555;', 'color: #6366f1; font-weight: bold;', 'color: #555;', 'color: #ef4444;', 'color: #e5e7eb;'
    );
  }
};

Loguru.info('AeroCalc application script starting...', 'Bootstrap');

// --- State Management ---
const state = {
  expression: '',
  result: '0',
  isEvaluated: false,
  angleUnit: 'DEG', // 'DEG' or 'RAD'
  soundEnabled: true,
  theme: 'dark',
  history: [],
  maxHistorySize: 20
};

// --- DOM Elements ---
const elements = {
  calculatorCard: document.getElementById('calculator-card'),
  expressionDisplay: document.getElementById('expression-display'),
  resultDisplay: document.getElementById('result-display'),
  soundToggle: document.getElementById('sound-toggle'),
  soundOnIcon: document.querySelector('#sound-toggle .sound-on'),
  soundOffIcon: document.querySelector('#sound-toggle .sound-off'),
  themeToggle: document.getElementById('theme-toggle'),
  themeSunIcon: document.querySelector('#theme-toggle .theme-sun'),
  themeMoonIcon: document.querySelector('#theme-toggle .theme-moon'),
  historyToggle: document.getElementById('history-toggle'),
  historyPanel: document.getElementById('history-panel'),
  closeHistoryBtn: document.getElementById('close-history-btn'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  historyList: document.getElementById('history-list'),
  modeStd: document.getElementById('mode-std'),
  modeSci: document.getElementById('mode-sci'),
  angleUnitBadge: document.getElementById('angle-unit-badge'),
  copyBtn: document.getElementById('copy-display-btn'),
  copyTooltip: document.getElementById('copy-tooltip'),
  scientificPad: document.getElementById('scientific-pad'),
  keypadWrapper: document.querySelector('.keypad-wrapper'),
  keys: document.querySelectorAll('.key, .key-equals')
};

// --- Web Audio Click Synth ---
let audioCtx = null;

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    Loguru.info('AudioContext initialized successfully', 'Audio');
  }
}

function playClickSound() {
  if (!state.soundEnabled) return;
  
  try {
    initAudioContext();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    
    // 1. High frequency mechanical "tick"
    const tickOsc = audioCtx.createOscillator();
    const tickGain = audioCtx.createGain();
    
    tickOsc.type = 'triangle';
    tickOsc.frequency.setValueAtTime(1400, now);
    tickOsc.frequency.exponentialRampToValueAtTime(1800, now + 0.008);
    
    tickGain.gain.setValueAtTime(0.08, now);
    tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
    
    tickOsc.connect(tickGain);
    tickGain.connect(audioCtx.destination);
    tickOsc.start(now);
    tickOsc.stop(now + 0.015);
    
    // 2. Low-mid key "thud" body sound
    const thudOsc = audioCtx.createOscillator();
    const thudGain = audioCtx.createGain();
    
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(160, now);
    thudOsc.frequency.exponentialRampToValueAtTime(80, now + 0.03);
    
    thudGain.gain.setValueAtTime(0.12, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    
    thudOsc.connect(thudGain);
    thudGain.connect(audioCtx.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.045);
    
  } catch (err) {
    Loguru.error('Failed to play synthesized click sound', 'Audio', err);
  }
}

// --- Local Storage Management ---
function loadSettingsAndHistory() {
  try {
    // Load theme
    const savedTheme = localStorage.getItem('aerocalc-theme');
    if (savedTheme) {
      state.theme = savedTheme;
      document.body.className = `${savedTheme}-theme`;
      if (savedTheme === 'light') {
        elements.themeSunIcon.classList.remove('hidden');
        elements.themeMoonIcon.classList.add('hidden');
      } else {
        elements.themeSunIcon.classList.add('hidden');
        elements.themeMoonIcon.classList.remove('hidden');
      }
      Loguru.info(`Theme loaded: ${savedTheme}`, 'Storage');
    }

    // Load sound settings
    const savedSound = localStorage.getItem('aerocalc-sound');
    if (savedSound !== null) {
      state.soundEnabled = savedSound === 'true';
      if (state.soundEnabled) {
        elements.soundOnIcon.classList.remove('hidden');
        elements.soundOffIcon.classList.add('hidden');
      } else {
        elements.soundOnIcon.classList.add('hidden');
        elements.soundOffIcon.classList.remove('hidden');
      }
      Loguru.info(`Sound preference loaded: ${state.soundEnabled}`, 'Storage');
    }

    // Load angle unit
    const savedAngle = localStorage.getItem('aerocalc-angle');
    if (savedAngle) {
      state.angleUnit = savedAngle;
      elements.angleUnitBadge.textContent = savedAngle;
      const angleKey = document.getElementById('key-angle');
      if (angleKey) angleKey.textContent = savedAngle === 'DEG' ? 'RAD' : 'DEG';
    }

    // Load history
    const savedHistory = localStorage.getItem('aerocalc-history');
    if (savedHistory) {
      state.history = JSON.parse(savedHistory);
      renderHistory();
      Loguru.info(`Loaded ${state.history.length} items from history`, 'Storage');
    }
  } catch (err) {
    Loguru.error('Error loading settings or history from local storage', 'Storage', err);
  }
}

function saveHistoryToStorage() {
  try {
    localStorage.setItem('aerocalc-history', JSON.stringify(state.history));
  } catch (err) {
    Loguru.error('Failed to save history to storage', 'Storage', err);
  }
}

// --- History UI Control ---
function addHistoryItem(exp, res) {
  state.history.unshift({ expression: exp, result: res });
  if (state.history.length > state.maxHistorySize) {
    state.history.pop();
  }
  saveHistoryToStorage();
  renderHistory();
  Loguru.info(`Added history item: "${exp} = ${res}"`, 'History');
}

function renderHistory() {
  elements.historyList.innerHTML = '';
  if (state.history.length === 0) {
    elements.historyList.innerHTML = '<div class="history-empty">기록이 없습니다.</div>';
    return;
  }

  state.history.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <span class="history-item-exp">${item.expression}</span>
      <span class="history-item-res">${item.result}</span>
    `;
    div.addEventListener('click', () => {
      playClickSound();
      state.expression = item.expression;
      state.result = item.result;
      state.isEvaluated = true;
      updateDisplay();
      elements.historyPanel.classList.remove('active');
      Loguru.info(`Restored history item index ${index}`, 'History');
    });
    elements.historyList.appendChild(div);
  });
}

function clearHistory() {
  state.history = [];
  saveHistoryToStorage();
  renderHistory();
  Loguru.info('All calculation history cleared', 'History');
}

// --- Font Scaling ---
function scaleDisplayFont() {
  const len = elements.resultDisplay.textContent.length;
  if (len > 16) {
    elements.resultDisplay.style.fontSize = '1.3rem';
  } else if (len > 12) {
    elements.resultDisplay.style.fontSize = '1.6rem';
  } else if (len > 8) {
    elements.resultDisplay.style.fontSize = '1.9rem';
  } else {
    elements.resultDisplay.style.fontSize = '2.2rem';
  }
}

// --- Display update ---
function updateDisplay() {
  // Replace mathematical operators with screen-friendly display symbols
  let displayExpr = state.expression
    .replace(/\*/g, ' × ')
    .replace(/\//g, ' ÷ ')
    .replace(/\-/g, ' − ')
    .replace(/\+/g, ' + ')
    .replace(/pi/g, 'π')
    .replace(/\^2/g, '²')
    .replace(/\^/g, ' ^ ');

  elements.expressionDisplay.textContent = displayExpr;
  elements.resultDisplay.textContent = state.result;
  scaleDisplayFont();
}

// --- Math Parser & Evaluator Engine ---
/**
 * Safe Custom Tokenizer & Recursive Descent Math Parser
 * This avoids eval() security risks and ensures robust scientific operator support!
 */
class MathParser {
  constructor(input, angleUnit = 'DEG') {
    this.tokens = this.tokenize(input);
    this.pos = 0;
    this.angleUnit = angleUnit;
  }

  tokenize(str) {
    // Normalise inputs
    str = str.replace(/\s+/g, '')
             .replace(/π/g, 'pi')
             .replace(/−/g, '-')
             .replace(/×/g, '*')
             .replace(/÷/g, '/');

    const regex = /([0-9]*\.[0-9]+|[0-9]+\.?[0-9]*)|(sin|cos|tan|log|ln|sqrt|abs|exp)|(pi|e)|(\*\*|\^|\+|-|\*|\/|%|!|\(|\))/g;
    const tokens = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
      if (match[1]) tokens.push({ type: 'NUM', val: parseFloat(match[1]) });
      else if (match[2]) tokens.push({ type: 'FUNC', val: match[2] });
      else if (match[3]) tokens.push({ type: 'CONST', val: match[3] });
      else if (match[4]) tokens.push({ type: 'OP', val: match[4] });
    }
    return tokens;
  }

  peek() {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  consume() {
    return this.pos < this.tokens.length ? this.tokens[this.pos++] : null;
  }

  // Expression = Term ((+ | -) Term)*
  parse() {
    let result = this.parseTerm();
    while (true) {
      const next = this.peek();
      if (next && next.type === 'OP' && (next.val === '+' || next.val === '-')) {
        this.consume();
        const term = this.parseTerm();
        if (next.val === '+') result += term;
        else result -= term;
      } else {
        break;
      }
    }
    return result;
  }

  // Term = Power ((* | / | %) Power)*
  parseTerm() {
    let result = this.parsePower();
    while (true) {
      const next = this.peek();
      if (next && next.type === 'OP' && (next.val === '*' || next.val === '/' || next.val === '%')) {
        this.consume();
        const power = this.parsePower();
        if (next.val === '*') result *= power;
        else if (next.val === '/') {
          if (power === 0) throw new Error('Division by zero');
          result /= power;
        } else {
          result %= power;
        }
      } else {
        break;
      }
    }
    return result;
  }

  // Power = Factor (^ Factor)*
  parsePower() {
    let result = this.parseFactor();
    while (true) {
      const next = this.peek();
      if (next && next.type === 'OP' && (next.val === '^' || next.val === '**')) {
        this.consume();
        const factor = this.parseFactor();
        result = Math.pow(result, factor);
      } else {
        break;
      }
    }
    return result;
  }

  // Factor = Number | Constant | Function | ( Expression ) | - Factor | Factor !
  parseFactor() {
    const token = this.peek();
    if (!token) throw new Error('Unexpected end of expression');

    let result;

    if (token.type === 'OP' && token.val === '-') {
      this.consume();
      result = -this.parseFactor();
    } else if (token.type === 'NUM') {
      this.consume();
      result = token.val;
    } else if (token.type === 'CONST') {
      this.consume();
      result = token.val === 'pi' ? Math.PI : Math.E;
    } else if (token.type === 'FUNC') {
      this.consume();
      // Expect parenthesis (
      const next = this.peek();
      if (next && next.type === 'OP' && next.val === '(') {
        this.consume();
        let arg = this.parse();
        const closing = this.consume();
        if (!closing || closing.val !== ')') throw new Error('Missing closing parenthesis');
        
        result = this.evalFunc(token.val, arg);
      } else {
        // Support function without parentheses like sin pi
        let arg = this.parseFactor();
        result = this.evalFunc(token.val, arg);
      }
    } else if (token.type === 'OP' && token.val === '(') {
      this.consume();
      result = this.parse();
      const closing = this.consume();
      if (!closing || closing.val !== ')') throw new Error('Missing closing parenthesis');
    } else {
      throw new Error(`Unexpected token: ${token.val}`);
    }

    // Check for trailing factorial
    const next = this.peek();
    if (next && next.type === 'OP' && next.val === '!') {
      this.consume();
      result = this.factorial(result);
    }

    return result;
  }

  evalFunc(func, arg) {
    switch (func) {
      case 'sin':
        return Math.sin(this.angleUnit === 'DEG' ? this.degToRad(arg) : arg);
      case 'cos':
        return Math.cos(this.angleUnit === 'DEG' ? this.degToRad(arg) : arg);
      case 'tan': {
        const rad = this.angleUnit === 'DEG' ? this.degToRad(arg) : arg;
        // Handle tan(90 deg) or tan(pi/2 rad) which is undefined
        if (Math.abs(Math.cos(rad)) < 1e-15) throw new Error('Undefined value');
        return Math.tan(rad);
      }
      case 'log':
        if (arg <= 0) throw new Error('Invalid logarithmic argument');
        return Math.log10(arg);
      case 'ln':
        if (arg <= 0) throw new Error('Invalid logarithmic argument');
        return Math.log(arg);
      case 'sqrt':
        if (arg < 0) throw new Error('Square root of negative number');
        return Math.sqrt(arg);
      case 'abs':
        return Math.abs(arg);
      case 'exp':
        return Math.exp(arg);
      default:
        throw new Error(`Unknown function: ${func}`);
    }
  }

  degToRad(deg) {
    return (deg * Math.PI) / 180;
  }

  factorial(n) {
    if (n < 0 || !Number.isInteger(n)) throw new Error('Factorial works on non-negative integers only');
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }
}

// --- Key Actions Handler ---
function handleKeyAction(val, action, type) {
  initAudioContext();
  playClickSound();

  // Clear evaluated state on new input
  if (state.isEvaluated && action !== 'calculate') {
    if (action === 'clear') {
      // Full clear
    } else if (action === 'backspace') {
      // Keep expression but empty result
    } else if (type === 'operator' || action === 'sci-func') {
      // Chain results
      state.expression = state.result;
    } else {
      // Reset
      state.expression = '';
    }
    state.isEvaluated = false;
  }

  // Perform actions
  if (action === 'clear') {
    state.expression = '';
    state.result = '0';
    Loguru.info('Calculator cleared', 'Interaction');
  } 
  
  else if (action === 'backspace') {
    if (state.expression.length > 0) {
      // Check if backspacing a whole function like "sin("
      const funcs = ['sin(', 'cos(', 'tan(', 'log(', 'ln(', 'sqrt(', 'abs(', 'exp('];
      let matchedFunc = false;
      for (const fn of funcs) {
        if (state.expression.endsWith(fn)) {
          state.expression = state.expression.slice(0, -fn.length);
          matchedFunc = true;
          break;
        }
      }
      if (!matchedFunc) {
        state.expression = state.expression.slice(0, -1);
      }
    }
  } 
  
  else if (action === 'calculate') {
    if (!state.expression) return;
    
    // Balance parentheses before evaluating
    let balancedExpr = state.expression;
    const openCount = (balancedExpr.match(/\(/g) || []).length;
    const closeCount = (balancedExpr.match(/\)/g) || []).length;
    if (openCount > closeCount) {
      balancedExpr += ')'.repeat(openCount - closeCount);
    }

    Loguru.info(`Evaluating expression: "${balancedExpr}"`, 'MathEngine');
    
    try {
      const parser = new MathParser(balancedExpr, state.angleUnit);
      let calcVal = parser.parse();
      
      // Handle floating point precision errors e.g., 0.1 + 0.2 = 0.30000000000000004
      if (typeof calcVal === 'number' && !isNaN(calcVal)) {
        if (Math.abs(calcVal) < 1e-12) {
          calcVal = 0;
        } else {
          // Limit to 12 decimal places to avoid visual weirdness, but don't force it if integer
          calcVal = parseFloat(calcVal.toFixed(12));
        }
      }

      const prevExpr = state.expression;
      state.result = String(calcVal);
      state.isEvaluated = true;
      
      // Save to History
      addHistoryItem(prevExpr, state.result);
      
    } catch (err) {
      Loguru.warn(`Evaluation failed for "${balancedExpr}": ${err.message}`, 'MathEngine');
      state.result = 'Error';
      state.isEvaluated = true;
    }
  } 
  
  else if (action === 'toggle-angle') {
    state.angleUnit = state.angleUnit === 'DEG' ? 'RAD' : 'DEG';
    localStorage.setItem('aerocalc-angle', state.angleUnit);
    elements.angleUnitBadge.textContent = state.angleUnit;
    const angleKey = document.getElementById('key-angle');
    if (angleKey) angleKey.textContent = state.angleUnit === 'DEG' ? 'RAD' : 'DEG';
    Loguru.info(`Angle unit changed to ${state.angleUnit}`, 'Interaction');
  } 
  
  else if (action === 'negate') {
    if (state.expression) {
      // Very simple negation logic for the expression display
      if (state.expression.startsWith('-(') && state.expression.endsWith(')')) {
        state.expression = state.expression.slice(2, -1);
      } else {
        state.expression = `-(${state.expression})`;
      }
    } else if (state.result !== '0') {
      state.result = state.result.startsWith('-') ? state.result.slice(1) : '-' + state.result;
    }
  }
  
  else if (action === 'sci-func') {
    state.expression += val;
  }
  
  else if (val !== undefined) {
    // Add implicit multiplication if typing constants/functions after closing bracket or numbers
    const lastChar = state.expression.slice(-1);
    const isNum = /[0-9.eπ]/.test(lastChar);
    const isCloseParen = lastChar === ')';
    
    if ((isNum || isCloseParen) && (val === 'pi' || val === 'e' || val === '(')) {
      state.expression += '*';
    }
    
    state.expression += val === 'pi' ? 'pi' : val;
  }

  updateDisplay();
}

// --- Dynamic Button Clicks Link ---
function setupKeypadEvents() {
  elements.keys.forEach(key => {
    key.addEventListener('click', () => {
      const val = key.getAttribute('data-val');
      const action = key.getAttribute('data-action');
      const isOperator = key.classList.contains('key-operator') || key.classList.contains('key-equals');
      const type = isOperator ? 'operator' : 'operand';
      
      handleKeyAction(val, action, type);
    });
  });
}

// --- Keyboard Event Mapping ---
function handleKeyboardEvents() {
  const keyMap = {
    '0': { val: '0' },
    '1': { val: '1' },
    '2': { val: '2' },
    '3': { val: '3' },
    '4': { val: '4' },
    '5': { val: '5' },
    '6': { val: '6' },
    '7': { val: '7' },
    '8': { val: '8' },
    '9': { val: '9' },
    '.': { val: '.' },
    '+': { val: '+' },
    '-': { val: '-' },
    '*': { val: '*' },
    'x': { val: '*' },
    '/': { val: '/' },
    '%': { val: '%' },
    '(': { val: '(' },
    ')': { val: ')' },
    '^': { val: '^', action: 'sci-func' },
    'p': { val: 'pi' },
    'e': { val: 'e' },
    'Enter': { action: 'calculate' },
    '=': { action: 'calculate' },
    'Backspace': { action: 'backspace' },
    'Escape': { action: 'clear' },
    'c': { action: 'clear' },
    'C': { action: 'clear' }
  };

  document.addEventListener('keydown', (e) => {
    // Avoid interfering with browser shortcuts if Alt/Ctrl is pressed
    if (e.ctrlKey || e.altKey) return;

    const mapped = keyMap[e.key];
    if (mapped) {
      e.preventDefault();
      
      // Perform action
      const type = (e.key === 'Enter' || e.key === '=' || ['+', '-', '*', '/', '%'].includes(e.key)) ? 'operator' : 'operand';
      handleKeyAction(mapped.val, mapped.action, type);

      // Visual Feedback Trigger on Keyboard Press
      triggerVisualButtonPress(e.key);
    }
  });
}

function triggerVisualButtonPress(key) {
  let targetBtn = null;

  // Map key string to DOM element searches
  if (/[0-9.]/.test(key)) {
    targetBtn = Array.from(elements.keys).find(btn => btn.getAttribute('data-val') === key && !btn.getAttribute('data-action'));
  } else if (key === '+') {
    targetBtn = document.getElementById('key-add');
  } else if (key === '-') {
    targetBtn = document.getElementById('key-sub');
  } else if (key === '*' || key === 'x') {
    targetBtn = document.getElementById('key-mul');
  } else if (key === '/') {
    targetBtn = document.getElementById('key-div');
  } else if (key === 'Enter' || key === '=') {
    targetBtn = document.getElementById('key-equals');
  } else if (key === 'Backspace') {
    targetBtn = document.getElementById('key-backspace');
  } else if (key === 'Escape' || key === 'c' || key === 'C') {
    targetBtn = document.getElementById('key-clear');
  } else if (key === '%') {
    targetBtn = Array.from(elements.keys).find(btn => btn.getAttribute('data-val') === '%');
  } else if (key === '(' || key === ')') {
    targetBtn = Array.from(elements.keys).find(btn => btn.getAttribute('data-val') === key);
  }

  if (targetBtn) {
    targetBtn.classList.add('keyboard-active');
    setTimeout(() => {
      targetBtn.classList.remove('keyboard-active');
    }, 100);
  }
}

// --- Toggle Panels & Themes UI ---
function setupSettingsToggles() {
  // Theme Toggle
  elements.themeToggle.addEventListener('click', () => {
    initAudioContext();
    playClickSound();
    
    if (state.theme === 'dark') {
      state.theme = 'light';
      document.body.className = 'light-theme';
      elements.themeSunIcon.classList.remove('hidden');
      elements.themeMoonIcon.classList.add('hidden');
    } else {
      state.theme = 'dark';
      document.body.className = 'dark-theme';
      elements.themeSunIcon.classList.add('hidden');
      elements.themeMoonIcon.classList.remove('hidden');
    }
    localStorage.setItem('aerocalc-theme', state.theme);
    Loguru.info(`Theme toggled manually to: ${state.theme}`, 'Settings');
  });

  // Sound Toggle
  elements.soundToggle.addEventListener('click', () => {
    initAudioContext();
    state.soundEnabled = !state.soundEnabled;
    localStorage.setItem('aerocalc-sound', state.soundEnabled);
    
    if (state.soundEnabled) {
      elements.soundOnIcon.classList.remove('hidden');
      elements.soundOffIcon.classList.add('hidden');
      playClickSound();
    } else {
      elements.soundOnIcon.classList.add('hidden');
      elements.soundOffIcon.classList.remove('hidden');
    }
    Loguru.info(`Audio feedback toggled manually to: ${state.soundEnabled}`, 'Settings');
  });

  // History Toggle
  elements.historyToggle.addEventListener('click', () => {
    initAudioContext();
    playClickSound();
    elements.historyPanel.classList.add('active');
    Loguru.info('History panel opened', 'History');
  });

  elements.closeHistoryBtn.addEventListener('click', () => {
    playClickSound();
    elements.historyPanel.classList.remove('active');
    Loguru.info('History panel closed', 'History');
  });

  elements.clearHistoryBtn.addEventListener('click', () => {
    playClickSound();
    clearHistory();
  });

  // Copy Clipboard
  elements.copyBtn.addEventListener('click', () => {
    initAudioContext();
    playClickSound();
    
    const valueToCopy = state.result;
    navigator.clipboard.writeText(valueToCopy).then(() => {
      Loguru.info(`Result successfully copied to clipboard: ${valueToCopy}`, 'Clipboard');
      elements.copyBtn.classList.add('copied');
      setTimeout(() => {
        elements.copyBtn.classList.remove('copied');
      }, 1500);
    }).catch(err => {
      Loguru.error('Failed to copy to clipboard', 'Clipboard', err);
    });
  });

  // Click badge to toggle DEG/RAD
  elements.angleUnitBadge.addEventListener('click', () => {
    handleKeyAction(null, 'toggle-angle');
  });
}

// --- Mode Switch Tab Logic ---
function setupModeSwitcher() {
  const switchMode = (mode) => {
    initAudioContext();
    playClickSound();
    
    if (mode === 'std') {
      elements.modeStd.classList.add('active');
      elements.modeSci.classList.remove('active');
      elements.calculatorCard.classList.remove('scientific-mode');
      Loguru.info('Switched to Standard Mode', 'ModeSelector');
    } else {
      elements.modeStd.classList.remove('active');
      elements.modeSci.classList.add('active');
      elements.calculatorCard.classList.add('scientific-mode');
      Loguru.info('Switched to Scientific Mode', 'ModeSelector');
    }
  };

  elements.modeStd.addEventListener('click', () => switchMode('std'));
  elements.modeSci.addEventListener('click', () => switchMode('sci'));
}

// --- App Initialization ---
function initApp() {
  loadSettingsAndHistory();
  setupKeypadEvents();
  handleKeyboardEvents();
  setupSettingsToggles();
  setupModeSwitcher();
  updateDisplay();
  Loguru.info('AeroCalc fully initialized and ready!', 'Bootstrap');
}

// Fire!
document.addEventListener('DOMContentLoaded', initApp);
