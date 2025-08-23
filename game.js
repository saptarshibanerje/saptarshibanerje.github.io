// Puppet Pop — simple marionette balloon game
(() => {
  const stage = document.getElementById('stage');
  const puppet = document.getElementById('puppet');
  const head   = document.getElementById('head');
  const armL   = document.getElementById('armL');
  const armR   = document.getElementById('armR');
  const legL   = document.getElementById('legL');
  const legR   = document.getElementById('legR');
  const handL  = document.getElementById('handL');
  const handR  = document.getElementById('handR');

  const scoreEl = document.getElementById('score');
  const timeEl  = document.getElementById('time');

  const sHead = document.getElementById('s-head');
  const sLeft = document.getElementById('s-left');
  const sRight= document.getElementById('s-right');
  const stringsSvg = document.getElementById('strings');

  // World & puppet state
  const world = {
    gravity: 1650,         // px/s^2
    floorY: null,          // computed later
    leftBound: 0,
    rightBound: 0,
    startedAt: performance.now()
  };

  const state = {
    px: window.innerWidth * 0.5, // puppet x (center)
    py: window.innerHeight * 0.38, // puppet y (top of container)
    vx: 0,
    vy: 0,
    speed: 360, // px/s
    jumping: false,
    score: 0,
    timeLeft: 60,
    over: false,
    // limb rotations (degrees)
    armLA: 10,  // a=angle relative to straight down
    armRA: -10,
    legLA: 4,
    legRA: -4,
  };

  // Key handling
  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.key.toLowerCase());

    if ((e.key === ' ' || e.key.toLowerCase() === 'w') && !state.jumping) {
      state.jumping = true;
      state.vy = -650; // jump impulse
      e.preventDefault();
    }
    if (e.key.toLowerCase() === 'r') {
      resetPose();
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  function resetPose() {
    state.armLA = 10; state.armRA = -10;
    state.legLA = 4;  state.legRA = -4;
  }

  // Balloon spawner
  let balloonTimer = 0;
  function spawnBalloon() {
    const b = document.createElement('div');
    b.className = 'balloon';
    const colorPick = Math.random();
    if (colorPick < 0.33) b.classList.add('color2');
    else if (colorPick < 0.66) b.classList.add('color3');

    const x = 60 + Math.random() * (window.innerWidth - 120);
    const y = window.innerHeight + 40 + Math.random() * 120; // start below floor
    b.style.left = `${x}px`;
    b.style.top  = `${y}px`;

    // Tail pieces
    const knot = document.createElement('div'); knot.className = 'knot';
    const tail = document.createElement('div'); tail.className = 'string';
    b.appendChild(knot); b.appendChild(tail);

    // Custom motion state
    b.dataset.vy = (-80 - Math.random() * 50).toString(); // upward
    b.dataset.vx = (Math.random() * 40 - 20).toString();   // drift
    b.dataset.rot = (Math.random() * 8 - 4).toString();

    stage.appendChild(b);
  }

  // Timer countdown
  let countdown = setInterval(() => {
    if (state.over) return;
    state.timeLeft--;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      gameOver();
    }
    timeEl.textContent = state.timeLeft.toString();
  }, 1000);

  function gameOver() {
    state.over = true;
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.55)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '50';
    overlay.innerHTML = `
      <div style="
        background: rgba(17,24,39,0.9);
        border: 1px solid rgba(255,255,255,0.1);
        padding: 22px 26px;
        border-radius: 14px;
        text-align: center;
        color: #e2e8f0;">
        <div style="font-size: 22px; font-weight: 800; margin-bottom: 6px;">Time!</div>
        <div style="font-size: 16px; opacity: 0.9; margin-bottom: 14px;">
          Your score: <strong>${state.score}</strong>
        </div>
        <button id="restart" style="
          cursor: pointer;
          padding: 10px 14px;
          font-weight: 700;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.15);
          background: linear-gradient(180deg, #1f2937, #111827); color: #f8fafc;">
          Play Again
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('restart').onclick = () => {
      // Cleanup balloons
      document.querySelectorAll('.balloon').forEach(b => b.remove());
      // Reset
      state.score = 0;
      scoreEl.textContent = '0';
      state.timeLeft = 60;
      timeEl.textContent = '60';
      state.over = false;
      overlay.remove();
    };
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function updateBounds() {
    const floor = document.querySelector('.floor').getBoundingClientRect();
    world.floorY = floor.top; // top of floor
    world.leftBound  = 10;
    world.rightBound = window.innerWidth - 10;
  }
  updateBounds();
  window.addEventListener('resize', updateBounds);

  function setPuppetPosition() {
    puppet.style.left = `${state.px}px`;
    puppet.style.top  = `${state.py}px`;
  }

  // Main loop
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000); // clamp big frames
    last = now;

    if (!state.over) {
      // Movement
      let ax = 0;
      if (keys.has('a') || keys.has('arrowleft'))  ax -= state.speed;
      if (keys.has('d') || keys.has('arrowright')) ax += state.speed;

      state.vx = ax === 0 ? state.vx * 0.85 : clamp(state.vx + ax * dt, -400, 400);
      state.px = clamp(state.px + state.vx * dt, world.leftBound, world.rightBound);

      // Gravity
      state.vy += world.gravity * dt;
      state.py += state.vy * dt;

      const puppetRect = puppet.getBoundingClientRect();
      const bottom = puppetRect.bottom;

      if (bottom >= world.floorY) {
        const overshoot = bottom - world.floorY;
        state.py -= overshoot;
        state.vy = 0;
        state.jumping = false;
      }

      // Limbs control
      if (keys.has('q')) state.armLA -= 150 * dt;
      if (keys.has('e')) state.armRA += 150 * dt;
      if (keys.has('z')) state.legLA -= 120 * dt;
      if (keys.has('c')) state.legRA += 120 * dt;

      // Return to neutral slowly
      state.armLA += (10 - state.armLA) * 0.6 * dt;
      state.armRA += (-10 - state.armRA) * 0.6 * dt;
      state.legLA += (4 - state.legLA) * 0.6 * dt;
      state.legRA += (-4 - state.legRA) * 0.6 * dt;

      // Clamp angles
      state.armLA = clamp(state.armLA, -110, 110);
      state.armRA = clamp(state.armRA, -110, 110);
      state.legLA = clamp(state.legLA, -60,  60);
      state.legRA = clamp(state.legRA, -60,  60);

      // Apply transforms
      armL.style.transform = `rotate(${state.armLA}deg)`;
      armR.style.transform = `rotate(${state.armRA}deg)`;
      legL.style.transform = `rotate(${state.legLA}deg)`;
      legR.style.transform = `rotate(${state.legRA}deg)`;

      setPuppetPosition();

      // Spawn balloons
      balloonTimer -= dt;
      if (balloonTimer <= 0) {
        spawnBalloon();
        balloonTimer = 0.9 + Math.random() * 0.9; // every ~0.9–1.8s
      }

      // Move balloons + collisions
      const balloons = document.querySelectorAll('.balloon');
      balloons.forEach((b) => {
        let x = parseFloat(b.style.left);
        let y = parseFloat(b.style.top);
        let vy = parseFloat(b.dataset.vy);
        let vx = parseFloat(b.dataset.vx);
        let rot = parseFloat(b.dataset.rot);

        // Gentle bobbing
        const t = (now - world.startedAt) / 1000;
        const sway = Math.sin(t * 2 + x * 0.01) * 10;
        x += (vx + sway * 0.4) * dt;
        y += vy * dt;
        b.style.left = `${x}px`;
        b.style.top  = `${y}px`;
        b.style.transform = `translate(-50%, -50%) rotate(${rot * Math.sin(t * 2)}deg)`;

        // Remove if off the top
        if (y < -60) b.remove();

        // Collision vs puppet hands, head
        const bRect = b.getBoundingClientRect();
        if (intersects(bRect, handL.getBoundingClientRect()) ||
            intersects(bRect, handR.getBoundingClientRect()) ||
            intersects(bRect, head.getBoundingClientRect())) {
          popBalloon(b);
        }
      });
    }

    // Update strings overlay
    updateStrings();

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function intersects(a, b) {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  function popBalloon(b) {
    if (!b || b.classList.contains('pop')) return;
    b.classList.add('pop');
    state.score++;
    scoreEl.textContent = state.score.toString();
    setTimeout(() => b.remove(), 220);
  }

  function updateStrings() {
    // Stretch three lines from the top rig to head + hands
    const rig = document.querySelector('.rig').getBoundingClientRect();
    const headR = head.getBoundingClientRect();
    const handLR = handL.getBoundingClientRect();
    const handRR = handR.getBoundingClientRect();
    const stageR = stage.getBoundingClientRect();

    // Convert to SVG coords (0..width/height)
    const svgW = stageR.width, svgH = stageR.height;

    function toSvgCoords(rect) {
      return {
        cx: (rect.left + rect.right) / 2 - stageR.left,
        cy: (rect.top + rect.bottom) / 2 - stageR.top
      };
    }
    const headC = toSvgCoords(headR);
    const leftC = toSvgCoords(handLR);
    const rightC= toSvgCoords(handRR);

    // Anchor points along rig
    const aHead = { x: (rig.left + rig.right)/2 - stageR.left, y: rig.bottom - stageR.top - 2 };
    const aLeft = { x: aHead.x - 120, y: aHead.y };
    const aRight= { x: aHead.x + 120, y: aHead.y };

    // Update viewBox to stage size
    stringsSvg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);

    sHead.setAttribute('x1', aHead.x); sHead.setAttribute('y1', aHead.y);
    sHead.setAttribute('x2', headC.cx); sHead.setAttribute('y2', headC.cy - 28);

    sLeft.setAttribute('x1', aLeft.x); sLeft.setAttribute('y1', aLeft.y);
    sLeft.setAttribute('x2', leftC.cx); sLeft.setAttribute('y2', leftC.cy);

    sRight.setAttribute('x1', aRight.x); sRight.setAttribute('y1', aRight.y);
    sRight.setAttribute('x2', rightC.cx); sRight.setAttribute('y2', rightC.cy);
  }

  // Initialize on load
  setPuppetPosition();

})();
