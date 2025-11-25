# 🐧 Tux Progamando: Endless Runner (Vanilla JS)

## 🎯 Sobre o Projeto
O projeto "Tux Progamando" é uma **demonstração de proficiência em engenharia de software front-end**, implementando um jogo estilo **Endless Runner** estritamente em **HTML5, CSS3 e JavaScript (Vanilla JS)**.
O objetivo primário foi validar um conhecimento profundo dos pilares da plataforma web, evitando o uso de frameworks de terceiros. O foco temático em **Cybersecurity/Tux/Windows** é criativo e relevante, utilizando o estilo visual **Pixel Art**. O protagonista é o **Tux (do Linux)**.

| Status | Gênero | Protagonista |
| :--- | :--- | :--- |
| Concluído (MVP) | Endless Runner | Tux (do Linux) |

---

## 💻 Stack Tecnológica e Arquitetura

O projeto aplica o princípio básico de **separação de responsabilidades**, utilizando uma stack pura e otimizada.

### 1. Racional da Stack

| Componente | Tecnologia | Racional / Vantagem |
| :--- | :--- | :--- |
| **Lógica de Jogo** | JavaScript Puro (Vanilla JS) | Decisão madura, ideal para controle total do DOM e demonstração de algoritmos puros (colisão, spawn dinâmico). |
| **Animação/Estilo** | CSS3 (Keyframes e Transform) | Uso de Keyframes e Transform para animação fluida, separando o motor de animação do layout estático. |
| **Áudio** | Web Audio API (OscillatorNode) | Diferencial técnico para evitar latência e sobrecarga de I/O de arquivos de áudio para *beeps*. |
| **Motor de Jogo** | `requestAnimationFrame` | Mecanismo de *loop* **obrigatório** para sincronizar com a taxa de atualização do monitor (**60 FPS**). |

---

## ⚡ Performance e Otimização

O relatório confirma que o projeto demonstra uma compreensão robusta de **otimização de renderização (60 FPS)**.

### 2.1. Otimização do *Rendering Pipeline*

* **Game Loop (60 FPS):** O uso de `requestAnimationFrame` na função `startGameLoop` garante que a atualização lógica do jogo e a repintura da tela sejam sincronizadas com a taxa de atualização do monitor, assegurando 60 FPS e evitando *jank* (travamentos).
* **Aceleração por GPU:** As animações complexas (como os elementos decorativos `icon-float` e `virus-float`) utilizam propriedades `transform` e `opacity`, que são manipuladas diretamente pela **GPU (Graphics Processing Unit)**.
* **Aviso de Mudança (`will-change`):** A propriedade `will-change: transform` é uma *hint* crucial que informa ao navegador quais propriedades serão animadas, permitindo-lhe otimizar a camada de renderização e **reduzir o *repaint*** do layout.

### 2.2. Dificuldade e Otimização de Recursos

* **Dificuldade Escalável:** As funções `getPipeDuration()` e `getSpawnDelay()` ajustam a velocidade e a frequência de *spawn* dos obstáculos com base na pontuação.
* **Eficiência da Engine:** A técnica de escalabilidade é eficiente em termos de recursos, pois a *engine* só precisa aumentar o *tick rate* da animação CSS, em vez de reescrever o código de movimento a cada *frame*.

---

## 🎮 Lógica de Jogo e Jogabilidade

### 3.1. Mecânica de Colisão e Pontuação

* **Detecção de Colisão:** A colisão utiliza uma implementação de **AABB (Axis-Aligned Bounding Box)** simplificada, verificada a cada *tick* do `requestAnimationFrame`. Esta abordagem é leve, performática e perfeitamente adequada para jogos 2D.
* **Controle de Debounce:** O código demonstra um controle de *Debounce* implícito ao verificar se o obstáculo já foi pontuado, prevenindo *double-scoring* no mesmo obstáculo.

### 3.2. Sistema de Animação do Pulo

O pulo é um **design de interação de alta qualidade**, priorizando a sensação de controle do usuário:
* **Física Enganada:** A animação `@keyframes jump` utiliza um **alongamento do ponto de altura máxima (40% a 60% do tempo total)**.
* **Melhor Jogabilidade:** Essa pequena "trapaça na física" aumenta o tempo de suspensão no ar e **melhora drasticamente a jogabilidade** e a sensação de controle para o usuário.

---

## 🛣️ Oportunidades de Evolução (Roadmap)

As seguintes recomendações visam aumentar a modularidade e a manutenibilidade do código:

* **Modularização JS (ES6 Modules):** Refatorar o `script.js` usando Módulos ES6 (`import`/`export`) para encapsular a lógica de Áudio, Colisão e Spawning em arquivos separados, reduzindo o acoplamento do código.
* **Padrão de Projeto Factory:** Introduzir um **Factory Pattern** para a criação de obstáculos. Isso permitiria a fácil introdução de novos tipos de obstáculos (ex.: vírus que se movem em padrões).

---

## ⚙️ Como Executar

Clone o repositório:
```bash
git clone [URL-DO-SEU-REPO]
