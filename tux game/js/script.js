/*
  ========================================
  tux game JUMP - LÓGICA JAVASCRIPT
  ========================================
  Arquivo principal com toda a lógica do jogo
  - Sistema de pulo
  - Geração de obstáculos
  - Detecção de colisão
  - Sistema de pontuação
  - Game Over e reinício
  ========================================
*/

// ==========================================
// SELEÇÃO DE ELEMENTOS DOM
// ==========================================
// Busca e armazena referências aos elementos HTML que serão manipulados
const mario = document.querySelector('.mario'); // Seleciona o elemento com classe 'mario' (personagem principal)
const gameBoard = document.querySelector('.game-board'); // Seleciona o container principal do jogo
const obstaclesContainer = document.querySelector('.obstacles'); // Container onde os obstáculos serão inseridos
const scoreEl = document.getElementById('score'); // Elemento que exibe a pontuação atual
const highscoreEl = document.getElementById('highscore'); // Elemento que exibe o recorde
const restartBtn = document.getElementById('restartBtn'); // Botão para reiniciar o jogo
const restartContainer = document.querySelector('.restart-container'); // Container do botão de reiniciar
const gameOverVideo = document.getElementById('gameOverVideo'); // Vídeo que aparece no game over
const gameOverOverlay = document.getElementById('gameOverOverlay'); // Overlay escuro no game over

// ==========================================
// VARIÁVEIS DE ESTADO DO JOGO
// ==========================================
let score = 0; // Pontuação atual do jogador (inicia em 0)
let highscore = Number(localStorage.getItem('marioHighscore')) || 0; // Recupera recorde salvo no navegador, ou 0 se não existir
let isGameOver = false; // Flag que indica se o jogo terminou (true = game over, false = jogo ativo)
let loopId = null; // ID do loop de animação (usado para cancelar quando necessário)
let spawnTimer = null; // Timer que controla quando o próximo obstáculo será criado

// ==========================================
// INICIALIZAÇÃO DA INTERFACE
// ==========================================
scoreEl.textContent = score; // Atualiza o texto do placar com a pontuação inicial (0)
highscoreEl.textContent = highscore; // Atualiza o texto do recorde com o valor salvo

// ==========================================
// PARÂMETROS DE VELOCIDADE E SPAWN
// ==========================================
const BASE_PIPE_DURATION = 1.6; // Duração base da animação do cano em segundos (velocidade inicial)
const MIN_PIPE_DURATION = 0.5; // Duração mínima permitida (velocidade máxima quando o jogo fica muito rápido)
const SPEED_STEP = 0.04; // Quantidade de segundos reduzidos por ponto (aumenta dificuldade progressivamente)

const SPAWN_MIN = 1200; // Intervalo mínimo entre obstáculos em milissegundos (1.2 segundos)
const SPAWN_MAX = 2200; // Intervalo máximo entre obstáculos em milissegundos (2.2 segundos)

// ==========================================
// SISTEMA DE ÁUDIO
// ==========================================
// Usa WebAudio API para gerar sons sem arquivos externos
const AudioContextClass = window.AudioContext || window.webkitAudioContext; // Compatibilidade com navegadores antigos
let audioCtx = null; // Contexto de áudio (será inicializado quando necessário)

/**
 * Garante que o contexto de áudio esteja inicializado
 * Alguns navegadores exigem interação do usuário antes de permitir áudio
 */
function ensureAudioCtx() {
  if (!audioCtx) { // Se o contexto ainda não foi criado
    audioCtx = new AudioContextClass(); // Cria um novo contexto de áudio
  }
}

/**
 * Gera um beep usando WebAudio API
 * @param {number} freq - Frequência do som em Hz (padrão: 440Hz = nota Lá)
 * @param {number} duration - Duração do som em milissegundos (padrão: 120ms)
 * @param {string} type - Tipo de onda: 'sine', 'square', 'triangle', 'sawtooth' (padrão: 'sine')
 */
function playBeep(freq = 440, duration = 120, type = 'sine') {
  ensureAudioCtx(); // Garante que o contexto de áudio existe
  if (audioCtx.state === 'suspended') audioCtx.resume(); // Retoma se estiver suspenso (alguns navegadores suspendem)
  
  const o = audioCtx.createOscillator(); // Cria um oscilador (gera a onda sonora)
  const g = audioCtx.createGain(); // Cria um ganho (controla o volume)
  
  o.type = type; // Define o tipo de onda (sine = suave, square = quadrada, etc)
  o.frequency.value = freq; // Define a frequência (pitch do som)
  o.connect(g); // Conecta o oscilador ao ganho
  g.connect(audioCtx.destination); // Conecta o ganho à saída de áudio (alto-falantes)
  
  // Configura o volume para evitar estouro (fade in/out suave)
  g.gain.setValueAtTime(0.0001, audioCtx.currentTime); // Volume inicial muito baixo
  g.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.01); // Aumenta rapidamente
  o.start(); // Inicia o som
  
  // Para o som após a duração especificada com fade out
  setTimeout(() => {
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.02); // Diminui o volume
    setTimeout(() => { 
      try { o.stop(); } catch (e) {} // Para o oscilador (try/catch evita erros se já parou)
    }, 30);
  }, duration);
}

// Funções de som específicas para cada ação do jogo
function playJumpSound(){ playBeep(900, 80, 'triangle'); } // Som agudo e curto para o pulo
function playScoreSound(){ playBeep(1200, 60, 'sine'); } // Som mais agudo para pontuação
function playCollisionSound(){ playBeep(120, 350, 'square'); } // Som grave e longo para colisão

// ==========================================
// FUNÇÕES DE CÁLCULO DE VELOCIDADE
// ==========================================

/**
 * Calcula a duração da animação do cano baseado na pontuação
 * Quanto maior a pontuação, mais rápido o cano se move
 * @returns {number} Duração em segundos (menor = mais rápido)
 */
function getPipeDuration() {
  // Math.max garante que nunca fique abaixo do mínimo (muito rápido)
  // BASE_PIPE_DURATION - (score * SPEED_STEP) reduz a duração conforme a pontuação aumenta
  return Math.max(MIN_PIPE_DURATION, BASE_PIPE_DURATION - score * SPEED_STEP);
}

/**
 * Calcula o intervalo aleatório até o próximo obstáculo aparecer
 * O intervalo diminui conforme a pontuação aumenta (obstáculos mais frequentes)
 * @returns {number} Intervalo em milissegundos
 */
function getSpawnDelay() {
  // Calcula o mínimo e máximo baseado na pontuação
  // Math.max garante que nunca fique abaixo de 400ms (muito rápido)
  const min = Math.max(400, SPAWN_MIN - score * 30); // Reduz 30ms por ponto
  const max = Math.max(700, SPAWN_MAX - score * 40); // Reduz 40ms por ponto
  
  // Retorna um número aleatório entre min e max
  return Math.floor(Math.random() * (max - min) + min);
}

// ==========================================
// GERAÇÃO DE OBSTÁCULOS
// ==========================================

/**
 * Cria um novo obstáculo (cano) e o adiciona ao jogo
 * Esta função é chamada recursivamente para criar obstáculos continuamente
 */
function spawnObstacle() {
  if (isGameOver) return; // Não cria obstáculos se o jogo terminou
  
  // Cria um elemento <img> para representar o obstáculo
  const img = document.createElement('img');
  img.src = './tux game img/pipe.png'; // Define a imagem do cano
  img.className = 'pipe'; // Adiciona a classe CSS para estilização
  img.dataset.scored = 'false'; // Flag para rastrear se o jogador já pontuou com este obstáculo
  
  const duration = getPipeDuration(); // Calcula a velocidade baseada na pontuação
  img.style.animation = `pipe-animation ${duration}s linear`; // Aplica a animação CSS de movimento
  
  obstaclesContainer.appendChild(img); // Adiciona o obstáculo ao DOM (aparece na tela)

  // Remove o obstáculo do DOM quando a animação terminar (otimização de memória)
  img.addEventListener('animationend', () => {
    if (img.parentElement) img.parentElement.removeChild(img); // Remove apenas se ainda estiver no DOM
  });

  // Agenda a criação do próximo obstáculo após um intervalo aleatório
  if (!isGameOver) { // Verifica novamente se o jogo não terminou
    spawnTimer = setTimeout(spawnObstacle, getSpawnDelay()); // Chama a função novamente após o delay
  }
}

// ==========================================
// SISTEMA DE PULO
// ==========================================

/**
 * Função que executa o pulo do personagem
 * Adiciona a classe CSS 'jump' que ativa a animação de pulo
 */
const jump = () => {
  if (isGameOver) return; // Não permite pular se o jogo terminou
  if (mario.classList.contains('jump')) return; // Não permite pular se já estiver pulando (evita spam)
  
  mario.classList.add('jump'); // Adiciona a classe que ativa a animação CSS de pulo
  playJumpSound(); // Toca o som de pulo
  
  // Remove a classe após 500ms (duração da animação) para permitir novo pulo
  setTimeout(() => mario.classList.remove('jump'), 500);
};

// ==========================================
// SISTEMA DE GAME OVER
// ==========================================

/**
 * Função chamada quando o jogador colide com um obstáculo
 * Para todas as animações, congela o jogo e exibe elementos de game over
 * @param {HTMLElement} hitPipe - O obstáculo com o qual o jogador colidiu
 */
function gameOver(hitPipe){
  if (isGameOver) return; // Evita que a função seja executada múltiplas vezes
  isGameOver = true; // Marca o jogo como terminado

  // Efeito de shake na tela (tremor visual)
  if (gameBoard) {
    gameBoard.classList.add('shake'); // Adiciona classe que ativa animação de tremor
    setTimeout(() => gameBoard.classList.remove('shake'), 500); // Remove após 500ms
  }

  // Para a criação de novos obstáculos
  if (spawnTimer) { 
    clearTimeout(spawnTimer); // Cancela o timer de spawn
    spawnTimer = null; // Limpa a variável
  }

  // Para o loop principal de verificação de colisão
  if (loopId) { 
    cancelAnimationFrame(loopId); // Cancela o requestAnimationFrame
    loopId = null; // Limpa a variável
  }

  // Para todas as animações de obstáculos e fixa suas posições
  document.querySelectorAll('.pipe').forEach(p => {
    const pos = p.offsetLeft; // Captura a posição horizontal atual
    p.style.animation = 'none'; // Remove a animação
    p.style.left = `${pos}px`; // Fixa o obstáculo na posição atual
  });

  // Congela o Mario na posição atual
  const marioPos = +window.getComputedStyle(mario).bottom.replace('px',''); // Obtém a posição vertical atual (remove 'px' e converte para número)
  mario.style.animation = 'none'; // Remove qualquer animação
  mario.style.bottom = `${marioPos}px`; // Fixa o Mario na posição atual
  mario.src = './tux game img/game-over.png'; // Troca a imagem para a versão "game over"
  mario.style.width = '110px'; // Ajusta o tamanho da imagem de game over
  mario.style.marginLeft = '50px'; // Ajusta a posição horizontal

  // Mostra o overlay escuro (fade in)
  if (gameOverOverlay) {
    gameOverOverlay.removeAttribute('hidden'); // Remove o atributo hidden (torna visível)
    setTimeout(() => gameOverOverlay.classList.add('show'), 10); // Adiciona classe para fade in após 10ms
  }

  // Mostra o vídeo de fundo (fade in)
  if (gameOverVideo) {
    gameOverVideo.removeAttribute('hidden'); // Remove o atributo hidden
    setTimeout(() => {
      gameOverVideo.classList.add('show'); // Adiciona classe para fade in
      gameOverVideo.play().catch(e => console.log('Erro ao reproduzir vídeo:', e)); // Tenta reproduzir o vídeo (catch evita erro se falhar)
    }, 100);
  }

  // Mostra o botão de reiniciar
  if (restartContainer) {
    restartContainer.removeAttribute('hidden'); // Remove o atributo hidden
  }
  restartBtn.classList.add('pulse'); // Adiciona animação pulsante ao botão

  playCollisionSound(); // Toca o som de colisão
}

// ==========================================
// LOOP PRINCIPAL DO JOGO
// ==========================================

/**
 * Inicia o loop principal que verifica colisões e atualiza a pontuação
 * Usa requestAnimationFrame para sincronizar com a taxa de atualização do navegador (60 FPS)
 */
function startGameLoop(){
  if (loopId) cancelAnimationFrame(loopId); // Cancela qualquer loop anterior se existir

  /**
   * Função que é executada a cada frame (aproximadamente 60 vezes por segundo)
   * Verifica colisões e atualiza a pontuação
   */
  const tick = () => {
    if (isGameOver) return; // Para o loop se o jogo terminou

    const pipes = document.querySelectorAll('.pipe'); // Busca todos os obstáculos na tela
    const marioPosition = +window.getComputedStyle(mario).bottom.replace('px',''); // Obtém a posição vertical do Mario (remove 'px' e converte para número)

    // Itera sobre cada obstáculo para verificar colisão e pontuação
    pipes.forEach(p => {
      const pipePosition = p.offsetLeft; // Obtém a posição horizontal do obstáculo (distância da borda esquerda)

      // Verifica colisão entre Mario e obstáculo
      // Condições: obstáculo está na zona de colisão (0-120px da esquerda) E Mario está no chão (altura < 80px)
      if (pipePosition <= 120 && pipePosition > 0 && marioPosition < 80) {
        gameOver(p); // Chama a função de game over
      }

      // Verifica se o jogador passou pelo obstáculo (pontuação)
      // Condições: jogo não terminou E ainda não pontuou com este obstáculo E obstáculo passou completamente pela esquerda
      if (!isGameOver && p.dataset.scored === 'false' && pipePosition <= 0) {
        p.dataset.scored = 'true'; // Marca como pontuado (evita pontuar múltiplas vezes)
        score += 1; // Incrementa a pontuação
        scoreEl.textContent = score; // Atualiza o texto na tela
        
        // Efeito visual ao pontuar
        scoreEl.classList.add('point-gained'); // Adiciona classe que ativa animação de destaque
        setTimeout(() => scoreEl.classList.remove('point-gained'), 400); // Remove após 400ms
        
        // Cria partícula visual de pontuação
        createScoreParticle(); // Chama função que cria efeito visual "+1"
        
        playScoreSound(); // Toca som de pontuação
        
        // Atualiza o recorde se necessário
        if (score > highscore) {
          highscore = score; // Atualiza o recorde local
          highscoreEl.textContent = highscore; // Atualiza o texto na tela
          localStorage.setItem('marioHighscore', highscore); // Salva no navegador (persiste após fechar)
        }
      }
    });

    // Agenda o próximo frame (continua o loop)
    loopId = requestAnimationFrame(tick); // requestAnimationFrame é otimizado pelo navegador (melhor que setInterval)
  };

  // Inicia o loop
  loopId = requestAnimationFrame(tick); // Primeira chamada inicia o loop
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

/**
 * Remove todos os obstáculos do DOM
 * Usado ao reiniciar o jogo
 */
function clearObstacles(){
  document.querySelectorAll('.pipe').forEach(p=> p.remove()); // Busca todos os obstáculos e remove do DOM
}

/**
 * Cria uma partícula visual que sobe quando o jogador pontua
 * Efeito visual de feedback positivo
 */
function createScoreParticle() {
  const particle = document.createElement('div'); // Cria um elemento <div> para a partícula
  particle.className = 'score-particle'; // Adiciona classe CSS que define estilo e animação
  particle.textContent = '+1'; // Texto exibido na partícula
  
  // Calcula a posição inicial (centro do Mario)
  const marioRect = mario.getBoundingClientRect(); // Obtém posição e tamanho do Mario na tela
  const gameBoardRect = gameBoard.getBoundingClientRect(); // Obtém posição do game-board na tela
  particle.style.left = `${marioRect.left - gameBoardRect.left + marioRect.width / 2}px`; // Centraliza horizontalmente no Mario
  particle.style.top = `${marioRect.top - gameBoardRect.top}px`; // Posiciona na altura do Mario
  
  gameBoard.appendChild(particle); // Adiciona a partícula ao DOM
  
  // Remove a partícula após 1 segundo (quando a animação termina)
  setTimeout(() => {
    if (particle.parentElement) { // Verifica se ainda está no DOM
      particle.remove(); // Remove do DOM
    }
  }, 1000);
}

// ==========================================
// SISTEMA DE REINÍCIO
// ==========================================

/**
 * Reinicia o jogo completamente
 * Restaura todos os estados iniciais e remove elementos de game over
 */
function restartGame(){
  // Limpa o estado do jogo
  isGameOver = false; // Marca o jogo como ativo novamente
  score = 0; // Zera a pontuação
  scoreEl.textContent = score; // Atualiza o texto na tela
  
  // Esconde o overlay escuro (fade out)
  if (gameOverOverlay) {
    gameOverOverlay.classList.remove('show'); // Remove classe que controla visibilidade
    setTimeout(() => {
      gameOverOverlay.setAttribute('hidden', ''); // Adiciona atributo hidden após fade out
    }, 500); // Aguarda 500ms (duração da transição)
  }
  
  // Esconde o vídeo de fundo (fade out)
  if (gameOverVideo) {
    gameOverVideo.classList.remove('show'); // Remove classe que controla visibilidade
    gameOverVideo.pause(); // Pausa o vídeo
    gameOverVideo.currentTime = 0; // Volta para o início do vídeo
    setTimeout(() => {
      gameOverVideo.setAttribute('hidden', ''); // Adiciona atributo hidden após fade out
    }, 500); // Aguarda 500ms (duração da transição)
  }
  
  // Esconde o botão de reiniciar
  if (restartContainer) {
    restartContainer.setAttribute('hidden', ''); // Adiciona atributo hidden
  }
  restartBtn.classList.remove('pulse'); // Remove animação pulsante

  // Restaura o Mario ao estado inicial
  mario.src = './tux game img/tux.gif'; // Volta para a imagem animada do Mario
  mario.style.width = ''; // Remove largura customizada
  mario.style.marginLeft = ''; // Remove margem customizada
  mario.style.animation = ''; // Remove animação customizada
  mario.style.bottom = ''; // Remove posição customizada (volta ao CSS padrão)

  // Limpa todos os obstáculos e reinicia o sistema de spawn
  clearObstacles(); // Remove todos os obstáculos do DOM
  if (spawnTimer) { 
    clearTimeout(spawnTimer); // Cancela timer anterior se existir
    spawnTimer = null; // Limpa a variável
  }
  spawnTimer = setTimeout(spawnObstacle, 600); // Agenda o primeiro obstáculo após 600ms

  // Reinicia o loop principal
  startGameLoop(); // Inicia novamente o loop de verificação de colisão
}

// ==========================================
// EVENT LISTENERS (OUVINTES DE EVENTOS)
// ==========================================

// Detecta quando qualquer tecla é pressionada e executa o pulo
document.addEventListener('keydown', (e)=> jump());
// Detecta quando a tela é tocada (mobile) e executa o pulo
document.addEventListener('touchstart', (e)=> jump());
// Detecta quando o botão de reiniciar é clicado
restartBtn.addEventListener('click', restartGame);

// ==========================================
// INICIALIZAÇÃO DO JOGO
// ==========================================

// Agenda o primeiro obstáculo para aparecer após 600ms
spawnTimer = setTimeout(spawnObstacle, 600);
// Inicia o loop principal de verificação de colisão
startGameLoop();
