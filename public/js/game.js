/**
 * Algorithm Master - Game Engine
 * ควบคุมตรรกะการเล่นเกม, Drag & Drop, การตรวจคำตอบ, Debounce 5s, Re-situation, และเวลา
 */

class AlgorithmGame {
  constructor() {
    this.questions = [...ALGORITHM_QUESTIONS];
    this.selectedTimeLimit = 60; // 60, 90, 120
    this.timeRemaining = 60;
    this.timerInterval = null;
    this.score = 0;
    this.currentQuestion = null;
    this.usedQuestionIds = new Set();
    this.reSituationsLeft = 2;
    this.isDebouncing = false;
    this.debounceTimer = null;
    this.debounceTimeRemaining = 5;
    this.exitConfirmState = false;
    this.exitConfirmTimeout = null;
    this.isGameActive = false;
    this.slots = []; // Array of { index, blockData }
    this.poolBlocks = []; // Array of block objects in pool

    // Drag and Drop state
    this.draggedItem = null;
    this.draggedSource = null; // 'pool' or 'slot'
    this.draggedSlotIndex = null;

    this.initDOMReferences();
    this.bindEvents();
  }

  initDOMReferences() {
    // Game Controls & UI Elements
    this.questionCategoryEl = document.getElementById('question-category');
    this.questionDifficultyEl = document.getElementById('question-difficulty');
    this.questionPointsEl = document.getElementById('question-points');
    this.questionTitleEl = document.getElementById('question-title');
    this.questionDescEl = document.getElementById('question-desc');
    this.questionHintEl = document.getElementById('question-hint');
    
    this.gameScoreEl = document.getElementById('game-score');
    this.gameTimerEl = document.getElementById('game-timer');
    this.gameTimerBarEl = document.getElementById('game-timer-bar');
    this.reSituationCountEl = document.getElementById('re-situation-count');
    
    this.slotsContainerEl = document.getElementById('algorithm-slots-container');
    this.blocksPoolContainerEl = document.getElementById('blocks-pool-container');
    this.errorFeedbackEl = document.getElementById('error-feedback-container');
    this.successBannerEl = document.getElementById('success-banner-container');
    
    // Action Buttons
    this.btnSubmit = document.getElementById('btn-submit-answer');
    this.btnReSituation = document.getElementById('btn-re-situation');
    this.btnExitGame = document.getElementById('btn-exit-game');
    this.submitProgressOverlay = document.getElementById('submit-progress-overlay');
    this.submitBtnText = document.getElementById('submit-btn-text');

    // Modals
    this.gameOverModal = document.getElementById('game-over-modal');
    this.finalScoreEl = document.getElementById('final-score-display');
    this.finalTimeEl = document.getElementById('final-time-display');
    this.finalDateEl = document.getElementById('final-date-display');
    this.playerNameInput = document.getElementById('player-name-input');
    this.btnSaveScore = document.getElementById('btn-save-score');
    this.btnPlayAgain = document.getElementById('btn-play-again');
  }

  bindEvents() {
    // Action buttons
    if (this.btnSubmit) {
      this.btnSubmit.addEventListener('click', () => this.handleSubmit());
    }
    if (this.btnReSituation) {
      this.btnReSituation.addEventListener('click', () => this.handleReSituation());
    }
    if (this.btnExitGame) {
      this.btnExitGame.addEventListener('click', () => this.handleExitGame());
    }

    // Game Over modal actions
    if (this.btnSaveScore) {
      this.btnSaveScore.addEventListener('click', () => this.handleSaveScore());
    }
    if (this.btnPlayAgain) {
      this.btnPlayAgain.addEventListener('click', () => {
        this.closeGameOverModal();
        window.app.switchPage('play');
      });
    }

    // Time Selection Cards
    document.querySelectorAll('.time-select-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const time = parseInt(card.dataset.time, 10);
        this.selectTimeMode(time);
      });
    });

    const btnStartLobby = document.getElementById('btn-start-game-lobby');
    if (btnStartLobby) {
      btnStartLobby.addEventListener('click', () => {
        this.startNewGame(this.selectedTimeLimit);
      });
    }
  }

  selectTimeMode(seconds) {
    this.selectedTimeLimit = seconds;
    document.querySelectorAll('.time-select-card').forEach(card => {
      if (parseInt(card.dataset.time, 10) === seconds) {
        card.classList.add('border-pink-500', 'bg-pink-50', 'dark:bg-pink-950/40', 'scale-105');
        card.classList.remove('border-zinc-800', 'dark:border-zinc-700');
        const badge = card.querySelector('.time-badge');
        if (badge) badge.classList.add('bg-pink-500', 'text-white');
      } else {
        card.classList.remove('border-pink-500', 'bg-pink-50', 'dark:bg-pink-950/40', 'scale-105');
        card.classList.add('border-zinc-800', 'dark:border-zinc-700');
        const badge = card.querySelector('.time-badge');
        if (badge) badge.classList.remove('bg-pink-500', 'text-white');
      }
    });

    // Render leaderboard for selected time
    if (typeof renderLeaderboardUI === 'function') {
      renderLeaderboardUI(String(seconds));
    }
  }

  startNewGame(timeLimit = 60) {
    this.selectedTimeLimit = timeLimit;
    this.timeRemaining = timeLimit;
    this.score = 0;
    this.usedQuestionIds.clear();
    this.reSituationsLeft = 2;
    this.isDebouncing = false;
    this.exitConfirmState = false;
    this.isGameActive = true;

    // Reset Exit button state
    this.resetExitButton();

    // Reset Action Debounce
    this.clearDebounce();

    // Switch view in Play page to Game Arena
    document.getElementById('play-lobby-view').classList.add('hidden');
    document.getElementById('play-arena-view').classList.remove('hidden');

    this.updateStatsUI();
    this.loadNextQuestion();
    this.startTimer();

    if (window.soundManager) window.soundManager.play('start');
  }

  startTimer() {
    clearInterval(this.timerInterval);
    this.updateTimerUI();

    this.timerInterval = setInterval(() => {
      if (!this.isGameActive) {
        clearInterval(this.timerInterval);
        return;
      }

      this.timeRemaining--;
      this.updateTimerUI();

      if (this.timeRemaining <= 10 && this.timeRemaining > 0) {
        if (window.soundManager) window.soundManager.play('tick');
      }

      if (this.timeRemaining <= 0) {
        this.endGame();
      }
    }, 1000);
  }

  updateTimerUI() {
    if (this.gameTimerEl) {
      this.gameTimerEl.textContent = `${this.timeRemaining}s`;
      if (this.timeRemaining <= 10) {
        this.gameTimerEl.classList.add('text-red-500', 'animate-pulse');
      } else {
        this.gameTimerEl.classList.remove('text-red-500', 'animate-pulse');
      }
    }

    if (this.gameTimerBarEl) {
      const percentage = Math.max(0, (this.timeRemaining / this.selectedTimeLimit) * 100);
      this.gameTimerBarEl.style.width = `${percentage}%`;
      if (percentage <= 20) {
        this.gameTimerBarEl.className = 'h-full bg-red-500 transition-all duration-300 rounded-full';
      } else if (percentage <= 50) {
        this.gameTimerBarEl.className = 'h-full bg-amber-400 transition-all duration-300 rounded-full';
      } else {
        this.gameTimerBarEl.className = 'h-full bg-pink-500 transition-all duration-300 rounded-full';
      }
    }
  }

  updateStatsUI() {
    if (this.gameScoreEl) this.gameScoreEl.textContent = this.score;
    if (this.reSituationCountEl) this.reSituationCountEl.textContent = `${this.reSituationsLeft}/2`;

    if (this.btnReSituation) {
      if (this.reSituationsLeft <= 0) {
        this.btnReSituation.disabled = true;
        this.btnReSituation.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        this.btnReSituation.disabled = false;
        this.btnReSituation.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
  }

  loadNextQuestion() {
    // Select a random question that hasn't been used yet in this run
    let available = this.questions.filter(q => !this.usedQuestionIds.has(q.id));
    if (available.length === 0) {
      // If all questions used, reset pool
      this.usedQuestionIds.clear();
      available = [...this.questions];
    }

    const randomIndex = Math.floor(Math.random() * available.length);
    this.currentQuestion = available[randomIndex];
    this.usedQuestionIds.add(this.currentQuestion.id);

    // Hide any previous error or success banners
    this.hideErrorFeedback();
    this.hideSuccessBanner();
    this.clearDebounce();

    // Render Question Header
    this.renderQuestionHeader();

    // Setup Slots and Randomized Pool
    this.setupSlotsAndPool();
  }

  renderQuestionHeader() {
    if (!this.currentQuestion) return;

    if (this.questionCategoryEl) this.questionCategoryEl.textContent = this.currentQuestion.category || "โจทย์อัลกอริทึม";
    if (this.questionDifficultyEl) {
      this.questionDifficultyEl.textContent = this.currentQuestion.difficulty;
      if (this.currentQuestion.difficulty.includes("ง่าย")) {
        this.questionDifficultyEl.className = "px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-500";
      } else if (this.currentQuestion.difficulty.includes("ปานกลาง")) {
        this.questionDifficultyEl.className = "px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-500";
      } else {
        this.questionDifficultyEl.className = "px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-500";
      }
    }
    if (this.questionPointsEl) this.questionPointsEl.textContent = `+${this.currentQuestion.points} แต้ม`;

    // Title ending with (X คะแนน) as required
    if (this.questionTitleEl) {
      this.questionTitleEl.innerHTML = `${this.currentQuestion.title} <span class="text-pink-500 font-extrabold ml-1">(${this.currentQuestion.points} คะแนน)</span>`;
    }

    if (this.questionDescEl) {
      this.questionDescEl.textContent = this.currentQuestion.description;
    }
  }

  setupSlotsAndPool() {
    const totalSteps = this.currentQuestion.correctSteps.length;
    
    // Initialize empty slots
    this.slots = Array.from({ length: totalSteps }, (_, i) => ({
      index: i,
      stepNumber: i + 1,
      blockData: null
    }));

    // Shuffle blocks for the pool
    const rawSteps = this.currentQuestion.correctSteps.map((text, originalIndex) => ({
      id: `block-${this.currentQuestion.id}-${originalIndex}`,
      originalIndex: originalIndex,
      text: text
    }));

    this.poolBlocks = this.shuffleArray([...rawSteps]);

    this.renderSlots();
    this.renderPool();
    this.updateSubmitButtonState();
  }

  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  renderSlots() {
    if (!this.slotsContainerEl) return;
    this.slotsContainerEl.innerHTML = '';

    this.slots.forEach((slot, index) => {
      const slotCard = document.createElement('div');
      slotCard.className = `slot-drop-zone relative rounded-2xl border-2 transition-all p-3 md:p-4 flex flex-col justify-center min-h-[76px] md:min-h-[88px] ${
        slot.blockData 
          ? 'border-zinc-800 dark:border-pink-500/80 bg-pink-50/70 dark:bg-zinc-800/90 shadow-[3px_3px_0px_#18181b] dark:shadow-[3px_3px_0px_#ff5e8e]' 
          : 'border-dashed border-zinc-400 dark:border-zinc-600 bg-white/60 dark:bg-zinc-900/40 hover:border-pink-400'
      }`;
      slotCard.dataset.slotIndex = index;

      // Slot index badge
      const headerRow = document.createElement('div');
      headerRow.className = 'flex items-center justify-between mb-1 pointer-events-none';
      headerRow.innerHTML = `
        <span class="text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 font-prompt">
          <span class="inline-block w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-center leading-5 text-[11px] font-extrabold font-mali">${slot.stepNumber}</span>
          ขั้นตอนที่ ${slot.stepNumber}
        </span>
        ${slot.blockData ? '<span class="text-[11px] text-pink-500 font-bold opacity-80">(แตะเพื่อนำออก)</span>' : '<span class="text-[11px] text-zinc-400">วางที่นี่</span>'}
      `;
      slotCard.appendChild(headerRow);

      if (slot.blockData) {
        const blockContent = document.createElement('div');
        blockContent.className = 'block-card cursor-pointer font-prompt text-zinc-900 dark:text-zinc-100 text-sm md:text-base font-medium flex items-start gap-2 select-none';
        blockContent.innerHTML = `
          <span class="text-pink-500 mt-0.5">📌</span>
          <span class="flex-1">${this.cleanStepText(slot.blockData.text)}</span>
        `;

        // Click / Tap to remove block back to pool
        slotCard.addEventListener('click', () => {
          this.removeBlockFromSlot(index);
        });

        // Make placed block draggable to other slots
        slotCard.draggable = true;
        slotCard.addEventListener('dragstart', (e) => {
          this.draggedItem = slot.blockData;
          this.draggedSource = 'slot';
          this.draggedSlotIndex = index;
          e.dataTransfer.setData('text/plain', slot.blockData.id);
          slotCard.classList.add('opacity-40');
        });
        slotCard.addEventListener('dragend', () => {
          slotCard.classList.remove('opacity-40');
        });

        slotCard.appendChild(blockContent);
      } else {
        const emptyPlaceholder = document.createElement('div');
        emptyPlaceholder.className = 'text-xs text-zinc-400 dark:text-zinc-500 italic py-1 pointer-events-none flex items-center justify-center gap-1.5';
        emptyPlaceholder.innerHTML = '<span>➕ ลากบล็อค หรือ แตะจากด้านล่าง</span>';
        slotCard.appendChild(emptyPlaceholder);
      }

      // Drag & Drop event listeners for Slot
      slotCard.addEventListener('dragover', (e) => {
        e.preventDefault();
        slotCard.classList.add('border-pink-500', 'bg-pink-100/50', 'scale-[1.02]');
      });

      slotCard.addEventListener('dragleave', () => {
        slotCard.classList.remove('border-pink-500', 'bg-pink-100/50', 'scale-[1.02]');
      });

      slotCard.addEventListener('drop', (e) => {
        e.preventDefault();
        slotCard.classList.remove('border-pink-500', 'bg-pink-100/50', 'scale-[1.02]');
        this.handleDropOnSlot(index);
      });

      this.slotsContainerEl.appendChild(slotCard);
    });
  }

  renderPool() {
    if (!this.blocksPoolContainerEl) return;
    this.blocksPoolContainerEl.innerHTML = '';

    if (this.poolBlocks.length === 0) {
      this.blocksPoolContainerEl.innerHTML = `
        <div class="w-full text-center py-6 text-emerald-600 dark:text-emerald-400 font-prompt font-bold flex flex-col items-center justify-center gap-1">
          <span class="text-3xl animate-bounce">✨</span>
          <span>ใส่บล็อคครบทุกช่องแล้ว! กดปุ่ม "Submit" ด้านล่างเพื่อส่งคำตอบ</span>
        </div>
      `;
      return;
    }

    this.poolBlocks.forEach((block, index) => {
      const blockCard = document.createElement('div');
      blockCard.className = 'doodle-card block-item bg-white dark:bg-zinc-800 border-2 border-zinc-800 dark:border-zinc-600 rounded-2xl p-3 md:p-3.5 shadow-[3px_3px_0px_#18181b] dark:shadow-[3px_3px_0px_#000] cursor-grab active:cursor-grabbing hover:border-pink-500 hover:-translate-y-0.5 transition-all text-sm md:text-base font-prompt text-zinc-900 dark:text-zinc-100 flex items-start gap-2.5 select-none';
      blockCard.draggable = true;
      blockCard.dataset.blockId = block.id;

      blockCard.innerHTML = `
        <span class="text-zinc-400 dark:text-zinc-500 mt-0.5 text-base">⠿</span>
        <span class="flex-1 font-medium leading-snug">${this.cleanStepText(block.text)}</span>
        <span class="text-xs bg-pink-100 dark:bg-pink-950/70 text-pink-600 dark:text-pink-400 font-bold px-2 py-0.5 rounded-full border border-pink-300 dark:border-pink-800 shrink-0">แตะใส่</span>
      `;

      // Tap / Click to place in first available slot
      blockCard.addEventListener('click', () => {
        this.placeBlockInFirstEmptySlot(block, index);
      });

      // Drag event listeners
      blockCard.addEventListener('dragstart', (e) => {
        this.draggedItem = block;
        this.draggedSource = 'pool';
        this.draggedSlotIndex = null;
        e.dataTransfer.setData('text/plain', block.id);
        blockCard.classList.add('opacity-40');
      });

      blockCard.addEventListener('dragend', () => {
        blockCard.classList.remove('opacity-40');
      });

      // Mobile Touch Drag handling
      this.attachTouchDrag(blockCard, block, index);

      this.blocksPoolContainerEl.appendChild(blockCard);
    });
  }

  // Remove numerical prefix (like "1. ", "2. ") from text so players can't just read the numbers!
  cleanStepText(text) {
    return text.replace(/^\d+\.\s*/, '');
  }

  placeBlockInFirstEmptySlot(block, poolIndex) {
    const emptySlotIndex = this.slots.findIndex(s => s.blockData === null);
    if (emptySlotIndex === -1) return;

    this.slots[emptySlotIndex].blockData = block;
    this.poolBlocks.splice(poolIndex, 1);

    if (window.soundManager) window.soundManager.play('place');

    this.renderSlots();
    this.renderPool();
    this.updateSubmitButtonState();
    this.hideErrorFeedback();
  }

  removeBlockFromSlot(slotIndex) {
    const slot = this.slots[slotIndex];
    if (!slot || !slot.blockData) return;

    const block = slot.blockData;
    slot.blockData = null;
    this.poolBlocks.push(block);

    if (window.soundManager) window.soundManager.play('pop');

    this.renderSlots();
    this.renderPool();
    this.updateSubmitButtonState();
    this.hideErrorFeedback();
  }

  handleDropOnSlot(targetSlotIndex) {
    if (!this.draggedItem) return;

    const currentTargetBlock = this.slots[targetSlotIndex].blockData;

    if (this.draggedSource === 'pool') {
      // Find block index in pool
      const pIdx = this.poolBlocks.findIndex(b => b.id === this.draggedItem.id);
      if (pIdx !== -1) {
        this.poolBlocks.splice(pIdx, 1);
      }
      if (currentTargetBlock) {
        // Return existing block to pool
        this.poolBlocks.push(currentTargetBlock);
      }
      this.slots[targetSlotIndex].blockData = this.draggedItem;
    } else if (this.draggedSource === 'slot') {
      // Swap between slots
      const sourceSlotIndex = this.draggedSlotIndex;
      if (sourceSlotIndex !== null && sourceSlotIndex !== targetSlotIndex) {
        this.slots[sourceSlotIndex].blockData = currentTargetBlock;
        this.slots[targetSlotIndex].blockData = this.draggedItem;
      }
    }

    if (window.soundManager) window.soundManager.play('place');

    this.draggedItem = null;
    this.draggedSource = null;
    this.draggedSlotIndex = null;

    this.renderSlots();
    this.renderPool();
    this.updateSubmitButtonState();
    this.hideErrorFeedback();
  }

  attachTouchDrag(element, block, poolIndex) {
    let touchStartX = 0;
    let touchStartY = 0;

    element.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartX);
      const deltaY = Math.abs(touch.clientY - touchStartY);

      // If it was a quick tap rather than a drag gesture, place immediately
      if (deltaX < 15 && deltaY < 15) {
        this.placeBlockInFirstEmptySlot(block, poolIndex);
      }
    });
  }

  updateSubmitButtonState() {
    const isAllFilled = this.slots.every(slot => slot.blockData !== null);

    if (this.btnSubmit) {
      if (isAllFilled && !this.isDebouncing) {
        this.btnSubmit.disabled = false;
        this.btnSubmit.className = 'w-full py-3.5 px-4 rounded-2xl font-bold font-prompt text-white bg-pink-500 hover:bg-pink-600 active:scale-95 shadow-[4px_4px_0px_#18181b] border-2 border-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer';
        if (this.submitBtnText) this.submitBtnText.textContent = 'ส่งคำตอบ (Submit)';
      } else if (this.isDebouncing) {
        this.btnSubmit.disabled = true;
        this.btnSubmit.className = 'w-full py-3.5 px-4 rounded-2xl font-bold font-prompt text-zinc-400 bg-zinc-200 dark:bg-zinc-800 border-2 border-zinc-400 dark:border-zinc-700 shadow-none cursor-not-allowed transition-all relative overflow-hidden flex items-center justify-center gap-2';
      } else {
        this.btnSubmit.disabled = true;
        this.btnSubmit.className = 'w-full py-3.5 px-4 rounded-2xl font-bold font-prompt text-zinc-400 bg-zinc-200 dark:bg-zinc-800 border-2 border-zinc-400 dark:border-zinc-700 shadow-none cursor-not-allowed transition-all flex items-center justify-center gap-2';
        if (this.submitBtnText) this.submitBtnText.textContent = 'ใส่บล็อคให้ครบก่อนส่ง';
      }
    }
  }

  handleSubmit() {
    if (this.isDebouncing || !this.isGameActive) return;

    const isAllFilled = this.slots.every(slot => slot.blockData !== null);
    if (!isAllFilled) return;

    // Check correctness
    const wrongSlotNumbers = [];
    this.slots.forEach((slot, index) => {
      if (slot.blockData.originalIndex !== index) {
        wrongSlotNumbers.push(slot.stepNumber);
      }
    });

    if (wrongSlotNumbers.length === 0) {
      // 100% CORRECT!
      this.handleCorrectAnswer();
    } else {
      // INCORRECT
      this.handleWrongAnswer(wrongSlotNumbers);
    }
  }

  handleCorrectAnswer() {
    if (window.soundManager) window.soundManager.play('correct');

    // Add points
    const earnedPoints = this.currentQuestion.points || 20;
    this.score += earnedPoints;
    this.updateStatsUI();

    // Show Success Banner for 2 seconds
    this.showSuccessBanner(earnedPoints);

    // Disable Submit during transition
    if (this.btnSubmit) this.btnSubmit.disabled = true;

    setTimeout(() => {
      if (!this.isGameActive) return;
      this.loadNextQuestion();
    }, 2000);
  }

  handleWrongAnswer(wrongSlotNumbers) {
    if (window.soundManager) window.soundManager.play('wrong');

    const wrongListText = wrongSlotNumbers.join(', ');
    const message = `❌ เรียงผิด ${wrongSlotNumbers.length} จุด: (ขั้นตอนที่ ${wrongListText} ยังไม่ถูกต้อง) โปรดปรับแก้และลองใหม่อีกครั้ง!`;
    this.showErrorFeedback(message);

    // Start 5s debounce cooldown
    this.startDebounce();
  }

  startDebounce() {
    this.isDebouncing = true;
    this.debounceTimeRemaining = 5;
    this.updateSubmitButtonState();

    if (this.submitProgressOverlay) {
      this.submitProgressOverlay.style.width = '100%';
      this.submitProgressOverlay.style.transition = 'none';
      // Force repaint
      void this.submitProgressOverlay.offsetWidth;
      this.submitProgressOverlay.style.transition = 'width 5000ms linear';
      this.submitProgressOverlay.style.width = '0%';
    }

    if (this.submitBtnText) {
      this.submitBtnText.textContent = `รอตรวจใหม่ (${this.debounceTimeRemaining}s)`;
    }

    clearInterval(this.debounceTimer);
    this.debounceTimer = setInterval(() => {
      this.debounceTimeRemaining--;
      if (this.submitBtnText) {
        this.submitBtnText.textContent = `รอตรวจใหม่ (${this.debounceTimeRemaining}s)`;
      }

      if (this.debounceTimeRemaining <= 0) {
        this.clearDebounce();
      }
    }, 1000);
  }

  clearDebounce() {
    this.isDebouncing = false;
    clearInterval(this.debounceTimer);
    if (this.submitProgressOverlay) {
      this.submitProgressOverlay.style.width = '0%';
      this.submitProgressOverlay.style.transition = 'none';
    }
    this.updateSubmitButtonState();
  }

  showErrorFeedback(message) {
    if (!this.errorFeedbackEl) return;
    this.errorFeedbackEl.innerHTML = `
      <div class="p-3.5 bg-red-50 dark:bg-red-950/60 border-2 border-red-500 text-red-700 dark:text-red-300 rounded-2xl shadow-[3px_3px_0px_#ef4444] font-prompt text-sm font-semibold flex items-center gap-2 animate-shake">
        <span class="text-xl shrink-0">⚠️</span>
        <span class="flex-1">${message}</span>
      </div>
    `;
    this.errorFeedbackEl.classList.remove('hidden');
  }

  hideErrorFeedback() {
    if (this.errorFeedbackEl) {
      this.errorFeedbackEl.classList.add('hidden');
      this.errorFeedbackEl.innerHTML = '';
    }
  }

  showSuccessBanner(earnedPoints) {
    if (!this.successBannerEl) return;
    this.successBannerEl.innerHTML = `
      <div class="p-4 bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-500 text-emerald-800 dark:text-emerald-200 rounded-2xl shadow-[4px_4px_0px_#10b981] font-prompt text-center animate-bounce">
        <p class="text-2xl font-extrabold font-mali">🎉 ถูกต้องยอดเยี่ยมมาก! (+${earnedPoints} คะแนน)</p>
        <p class="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">กำลังเตรียมโจทย์ถัดไปใน 2 วินาที...</p>
      </div>
    `;
    this.successBannerEl.classList.remove('hidden');
  }

  hideSuccessBanner() {
    if (this.successBannerEl) {
      this.successBannerEl.classList.add('hidden');
      this.successBannerEl.innerHTML = '';
    }
  }

  handleReSituation() {
    if (this.reSituationsLeft <= 0 || !this.isGameActive) return;

    this.reSituationsLeft--;
    this.updateStatsUI();

    if (window.soundManager) window.soundManager.play('pop');

    this.loadNextQuestion();
  }

  handleExitGame() {
    if (!this.exitConfirmState) {
      // First click: Ask confirmation
      this.exitConfirmState = true;
      if (this.btnExitGame) {
        this.btnExitGame.innerHTML = `<span>⚠️</span> Confirm Exit?`;
        this.btnExitGame.classList.add('bg-red-500', 'text-white', 'border-red-600');
        this.btnExitGame.classList.remove('bg-zinc-100', 'dark:bg-zinc-800');
      }

      clearTimeout(this.exitConfirmTimeout);
      this.exitConfirmTimeout = setTimeout(() => {
        this.resetExitButton();
      }, 4000);
    } else {
      // Second click: Confirm exit!
      this.resetExitButton();
      this.stopGame();
      window.app.switchPage('home');
    }
  }

  resetExitButton() {
    this.exitConfirmState = false;
    clearTimeout(this.exitConfirmTimeout);
    if (this.btnExitGame) {
      this.btnExitGame.innerHTML = `<span>🚪</span> ออกเกม`;
      this.btnExitGame.classList.remove('bg-red-500', 'text-white', 'border-red-600');
      this.btnExitGame.classList.add('bg-zinc-100', 'dark:bg-zinc-800');
    }
  }

  stopGame() {
    this.isGameActive = false;
    clearInterval(this.timerInterval);
    this.clearDebounce();
    this.hideErrorFeedback();
    this.hideSuccessBanner();

    // Reset Play arena to Lobby
    document.getElementById('play-arena-view').classList.add('hidden');
    document.getElementById('play-lobby-view').classList.remove('hidden');
  }

  endGame() {
    this.isGameActive = false;
    clearInterval(this.timerInterval);
    this.clearDebounce();

    if (window.soundManager) window.soundManager.play('gameover');

    // Show Game Over Modal
    this.showGameOverModal();
  }

  showGameOverModal() {
    if (!this.gameOverModal) return;

    if (this.finalScoreEl) this.finalScoreEl.textContent = this.score;
    if (this.finalTimeEl) this.finalTimeEl.textContent = `${this.selectedTimeLimit} วินาที`;
    if (this.finalDateEl) this.finalDateEl.textContent = formatToGMT7(new Date());

    if (this.playerNameInput) {
      this.playerNameInput.value = localStorage.getItem('last_player_name') || '';
    }

    this.gameOverModal.classList.remove('hidden');
  }

  closeGameOverModal() {
    if (this.gameOverModal) {
      this.gameOverModal.classList.add('hidden');
    }
    this.stopGame();
  }

  handleSaveScore() {
    const name = this.playerNameInput ? this.playerNameInput.value : "Player";
    localStorage.setItem('last_player_name', name);

    saveScoreToLeaderboard(name, this.score, this.selectedTimeLimit);

    if (window.soundManager) window.soundManager.play('correct');

    this.closeGameOverModal();
    if (typeof renderLeaderboardUI === 'function') {
      renderLeaderboardUI(String(this.selectedTimeLimit));
    }
    window.app.switchPage('play');
  }
}

// Instantiate game instance when DOM is ready
window.algorithmGame = null;
document.addEventListener('DOMContentLoaded', () => {
  window.algorithmGame = new AlgorithmGame();
});
