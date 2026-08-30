
    (function () {
      var state = { scenario: 'radar', severity: 0, hasResgate: true, alertActive: true, nrestAlto: true, bannerDismissed: false };

      var screens = document.querySelectorAll('.screen-view');
      var chatFab = document.getElementById('chatFab');

      function showScreen(name) {
        screens.forEach(function (s) { s.classList.toggle('is-active', s.dataset.screen === name); });
        if (name === 'home') updateHomeBanner();
      }

      // 'risk'    -> P(S_D>=X) abaixo do limiar: alerta completo com opções de ação
      // 'reminder'-> sem risco, mas pouco tempo até o fechamento: só um lembrete leve (Seção 5.1)
      // 'none'    -> sem risco e com tempo de sobra: tudo calmo
      function alertState() {
        if (state.alertActive) return 'risk';
        if (!state.nrestAlto) return 'reminder';
        return 'none';
      }

      function svgCheck() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 12.5l5 5L20 6"/></svg>'; }

      // Trajetória de custo: a tese exige que apareça sempre (Seção 5.3), mas não
      // precisa virar um gráfico de 3 linhas pra isso — uma frase compacta já
      // comunica o efeito bola de neve sem obrigar o cliente a rolar a tela pra
      // ler sobre um assunto sensível.
      function costCard() {
        return '<div class="bubble assistant">Sem ação, isso tende a crescer: <b class="tabular">R$ 1.200</b> hoje pode virar <b class="tabular">R$ 2.790</b> em 6 meses no rotativo.</div>';
      }

      // Usar dinheiro próprio (Resgate Seguro) é sempre melhor que criar dívida
      // nova — então, quando ele existe, é o "recomendado" e fica em destaque no
      // topo; o financiamento vira alternativa secundária, não os dois competindo
      // pelo mesmo destaque. Sem resgate disponível, o financiamento é a única
      // opção real e assume o destaque sozinho.
      function financingCard() {
        var sev = state.severity, alto = state.nrestAlto;
        var primary = !state.hasResgate;
        var cls = primary ? ' recommended' : '';
        if (sev === 0 && alto) {
          return '<div class="opt-card' + cls + '">' +
            '<div class="opt-head"><span class="opt-name">Cobrir o que falta</span>' + (primary ? '<span class="pill">recomendado</span>' : '') + '</div>' +
            '<p>Ainda dá tempo de escolher com calma. Comparamos as duas formas de cobrir o que falta:</p>' +
            '<div class="compare-row"><span>Empréstimo pessoal</span><span>~146% a.a.</span></div>' +
            '<div class="compare-row win"><span>Parcelar a fatura</span><span>~68% a.a. — mais barato</span></div>' +
            '<button class="btn btn-primary" data-action="parcelar">Parcelar fatura</button>' +
            '</div>';
        }
        if (sev === 0 && !alto) {
          return '<div class="opt-card' + cls + '">' +
            '<div class="opt-head"><span class="opt-name">Cobrir o que falta</span><span class="pill">urgente</span></div>' +
            '<p>O fechamento é amanhã — não há tempo para aprovação de empréstimo. Parcele agora para não entrar no rotativo.</p>' +
            '<button class="btn btn-primary" data-action="parcelar">Parcelar agora</button>' +
            '</div>';
        }
        if (sev === 1) {
          return '<div class="opt-card' + cls + '">' +
            '<div class="opt-head"><span class="opt-name">Reduzir o que falta</span><span class="pill">sem crédito novo</span></div>' +
            '<p>Sem oferta de empréstimo dessa vez. Duas formas de reduzir o problema sem criar compromisso novo:</p>' +
            '<div class="compare-row"><span>Parcelamento dimensionado</span><span>pela sua capacidade</span></div>' +
            '<div class="compare-row"><span>Amortizar com saldo em conta</span><span>reduz juro na hora</span></div>' +
            '<button class="btn btn-primary" data-action="amortizar">Amortizar com saldo em conta</button>' +
            '</div>';
        }
        return '<div class="opt-card">' +
          '<div class="opt-head"><span class="opt-name">Consolidar e encaminhar</span></div>' +
          '<p>Não existe uma correção mágica agora — sem crédito novo de nenhum tipo. O caminho é reduzir o dano e te colocar no canal certo.</p>' +
          '<button class="btn btn-primary" data-action="amortizar">Amortizar o que for possível</button>' +
          '<button class="btn btn-ghost" data-action="renegociar">Falar com especialista em renegociação</button>' +
          '</div>';
      }

      function rescueCard() {
        if (!state.hasResgate) return '';
        return '<div class="opt-card recommended">' +
          '<div class="opt-head"><span class="opt-name">Resgate Seguro</span><span class="pill">sem juros</span></div>' +
          '<p>Cofrinho "Emergência de Saúde": <b class="tabular">R$ 260</b> disponíveis, sem comprometer seus compromissos já agendados.</p>' +
          '<button class="btn btn-primary" data-action="resgatar">Resgatar e aplicar na fatura</button>' +
          '</div>';
      }

      function renderRadar() {
        var st = alertState();
        document.getElementById('radarStatusLabel').textContent =
          st === 'risk' ? 'alerta ativo' : (st === 'reminder' ? 'lembrete ativo' : 'tudo em dia');
        chatFab.classList.toggle('has-alert', st !== 'none');
        var body = document.getElementById('radarBody');
        if (st === 'none') {
          body.innerHTML =
            '<div class="bubble assistant">Oi, Rafaela! Por enquanto sua fatura está no controle — sem risco de rotativo previsto até o fechamento. Qualquer coisa, é só me chamar por aqui.</div>';
          return;
        }
        if (st === 'reminder') {
          body.innerHTML =
            '<div class="bubble assistant">Sua fatura fecha em breve. Pelo seu histórico, você deve conseguir cobrir tudo — só um lembrete para não perder o prazo.</div>';
          return;
        }
        body.innerHTML =
          spendingIntro() +
          '<div class="bubble assistant">Pelo seu ritmo atual, sua fatura pode fechar em <b class="tabular">R$ 380</b> no <b class="danger-text">vermelho</b>.</div>' +
          costCard() +
          rescueCard() +
          financingCard();
      }

      // "Opção 1": introdução por categoria de gasto + convite pro Consultor
      // Financeiro (conversa livre, ancorada no extrato, pra tirar dúvidas de
      // educação financeira e ver o que dá pra economizar). Não fecha o gap desta
      // fatura — é prevenção pro padrão, por isso muda de peso por perfil:
      //  - Nível 0 (nunca esteve em risco): só importa se sobra tempo (nrestAlto);
      //    com o fechamento perto, não há tempo de cortar gasto, então some.
      //  - Nível 1/2+ (recorrente): continua aparecendo mesmo com pouco tempo —
      //    não resolve o ciclo atual, mas é o sinal comportamental que mais importa
      //    pra esse perfil, então fica em destaque.
      function spendingIntro() {
        var line = 'Delivery <b class="tabular">R$ 320</b> · Lazer <b class="tabular">R$ 150</b> — 30% acima do seu padrão dos últimos 3 meses.';
        if (state.severity === 0 && !state.nrestAlto) return '';
        var destaque = state.severity > 0;
        return '<div class="bubble assistant' + (destaque ? ' highlight' : '') + '">' +
          '<span class="tag">Seus maiores gastos:</span>' + line +
          ' <button class="inline-ask" data-ask="o que dá pra economizar">Conversar sobre isso</button>' +
          '</div>';
      }

      function appendExchange(html) {
        var body = document.getElementById('radarBody');
        body.insertAdjacentHTML('beforeend', html);
        body.scrollTop = body.scrollHeight;
      }

      document.getElementById('radarBody').addEventListener('click', function (e) {
        var askBtn = e.target.closest('button[data-ask]');
        if (askBtn) { radarAsk(askBtn.dataset.ask); return; }
        var btn = e.target.closest('button[data-action]');
        if (!btn) return;
        var action = btn.dataset.action;
        btn.closest('.opt-card').querySelectorAll('button').forEach(function (b) { b.disabled = true; });
        if (action === 'resgatar') {
          appendExchange('<div class="success-chip">' + svgCheck() + 'R$ 260 resgatados e aplicados direto na fatura.</div>');
        } else if (action === 'parcelar') {
          appendExchange('<div class="success-chip">' + svgCheck() + 'Fatura parcelada. Você recebe o novo valor por mensagem em instantes.</div>');
        } else if (action === 'amortizar') {
          appendExchange('<div class="success-chip">' + svgCheck() + 'Valor amortizado — o juro do rotativo já recalcula a partir de agora.</div>');
        } else if (action === 'renegociar') {
          appendExchange('<div class="bubble assistant">Combinado. Vou te encaminhar para o time de renegociação — eles entram em contato ainda hoje.</div>');
        }
      });

      // "Opção 1" (aprofundamento): a conversa explica, o botão executa. Livre pra
      // perguntar e receber contexto/recomendação; nenhuma ação financeira sai daqui.
      function radarAsk(question) {
        appendExchange('<div class="bubble user">' + question + '</div>');
        var q = question.toLowerCase(), answer;
        if (q.indexOf('economiz') !== -1) {
          answer = state.severity === 0
            ? 'Olhando seu extrato, o gasto em Lazer está 30% acima da sua média dos últimos 3 meses — dá pra reduzir aí sem comprometer o resto do mês.'
            : 'Olhando seu extrato dos últimos meses, esse padrão em Lazer se repete todo ciclo. Não resolve a fatura de agora, mas é o que mais importa reorganizar pra não voltar a esse ponto.';
        } else if (q.indexOf('rotativo') !== -1) {
          answer = 'O rotativo é acionado quando você paga menos que o total da fatura — o restante rola pra linha de crédito mais cara do mercado (hoje entre 436% e 438% ao ano). Por isso vale evitar entrar nele, mesmo que pareça só um atraso pequeno.';
        } else if (q.indexOf('cdi') !== -1) {
          answer = 'CDI é a taxa que os bancos usam entre si como referência de custo de dinheiro no curto prazo — é a régua que a maioria dos investimentos de renda fixa usa como comparação.';
        } else if (q.indexOf('ldc') !== -1) {
          answer = 'LDC é a Linha de Crédito Consignada da sua conta — um limite pré-aprovado com taxa geralmente menor que o rotativo, útil pra cobrir um aperto pontual sem recorrer ao cartão.';
        } else if (q.indexOf('por que') !== -1 || q.indexOf('porque') !== -1) {
          answer = 'Somando seus gastos programados com o que já entrou e saiu da conta, a projeção não fecha com o valor da fatura até o vencimento — por isso o alerta apareceu agora, enquanto ainda dá tempo de agir.';
        } else if (q.indexOf('devo fazer') !== -1 || q.indexOf('você acha') !== -1 || q.indexOf('recomend') !== -1) {
          if (state.severity === 0) {
            answer = state.nrestAlto
              ? 'Pelo que vejo, parcelar a fatura sai mais barato que um empréstimo agora — eu recomendaria essa opção.'
              : 'Com o fechamento tão perto, parcelar é o caminho mais rápido e seguro daqui.';
          } else {
            answer = 'Não recomendo abrir crédito novo agora. O melhor caminho é amortizar com o que você já tem disponível e, se precisar, buscar uma renegociação.';
          }
        } else if (q.indexOf('esperar') !== -1 || q.indexOf('nada') !== -1) {
          answer = 'Se nada for feito, esse saldo tende a crescer como no gráfico acima — de R$ 1.200 para cerca de R$ 2.790 em 6 meses. Quanto antes agir, menor o custo.';
        } else if (q.indexOf('desativ') !== -1) {
          answer = 'Você pode desativar o Radar de Caixa quando quiser, em Ajustes &gt; Assistente &gt; Radar de Caixa.';
        } else if (q.indexOf('banco') !== -1 || q.indexOf('dados') !== -1) {
          answer = 'Esse alerta considera sua fatura Itaú e, se você conectou outros bancos, também os compromissos de lá — assim a previsão fica mais realista.';
        } else {
          answer = 'Posso explicar melhor se você perguntar por que esse alerta apareceu, o que dá para economizar, ou termos como rotativo, CDI e LDC.';
        }
        appendExchange('<div class="bubble assistant">' + answer + '</div>');
      }

      document.getElementById('radarSend').addEventListener('click', function () {
        var input = document.getElementById('radarInput');
        if (!input.value.trim()) return;
        radarAsk(input.value);
        input.value = '';
      });

      function renderOnboarding() {
        var body = document.getElementById('onboardingBody');
        body.innerHTML =
          '<div class="bubble assistant">Vamos deixar sua conta pronta. Primeiro: quero começar a usar meu cartão.</div>' +
          '<div class="opt-card"><div class="opt-head"><span class="opt-name">1. Ativar cartão</span><span class="pill">concluído</span></div><p>Toque em Cartões, no menu inferior, e depois em "Ativar".</p></div>' +
          '<div class="bubble assistant">Agora: quero fazer minha primeira transferência.</div>' +
          '<div class="opt-card"><div class="opt-head"><span class="opt-name">2. Primeira transferência</span><span class="pill">concluído</span></div><p>Toque em Pix e transferir, escolha o destinatário e confirme com sua senha.</p></div>' +
          '<div class="bubble assistant">Por último: conecte outras contas via Open Finance — assim eu enxergo compromissos que você tem em outros bancos, não só aqui.</div>' +
          '<div class="opt-card recommended"><div class="opt-head"><span class="opt-name">3. Conectar Open Finance</span><span class="pill">recomendado</span></div><p>Nos últimos 3 meses, isso teria te economizado <b class="tabular">R$ 210</b> em juros de rotativo.</p><button class="btn btn-primary" data-fake="1">Conectar agora</button></div>';
      }

      function renderFaq() {
        var body = document.getElementById('faqBody');
        body.innerHTML =
          '<div class="bubble user">Por que estão usando meus dados de outro banco?</div>' +
          '<div class="bubble assistant">Você conectou outro banco via Open Finance, então também vejo os compromissos de lá — a previsão fica mais precisa. Pode desconectar quando quiser em Ajustes.</div>';
      }

      function faqAsk(question) {
        var body = document.getElementById('faqBody');
        body.insertAdjacentHTML('beforeend', '<div class="bubble user">' + question + '</div>');
        var q = question.toLowerCase(), answer;
        if (q.indexOf('desativ') !== -1) {
          answer = 'Você pode desativar o Radar de Caixa quando quiser, em Ajustes &gt; Assistente &gt; Radar de Caixa.';
        } else if (q.indexOf('rotativo') !== -1 || q.indexOf('alerta') !== -1) {
          answer = 'O alerta aparece quando projetamos que sua fatura pode fechar sem saldo suficiente — assim você decide antes de entrar no rotativo.';
        } else if (q.indexOf('banco') !== -1 || q.indexOf('dados') !== -1) {
          answer = 'Usamos os dados das contas que você conectou via Open Finance só para enxergar seus compromissos em outros bancos e deixar a previsão mais precisa.';
        } else {
          answer = 'Boa pergunta! Posso te explicar melhor se você perguntar sobre o alerta, o rotativo ou os dados de outros bancos que usamos.';
        }
        body.insertAdjacentHTML('beforeend', '<div class="bubble assistant">' + answer + '</div>');
        body.scrollTop = body.scrollHeight;
      }

      function updateHomeBanner() {
        var st = alertState();
        var el = document.getElementById('homeBanner');
        el.classList.remove('risk', 'reminder');
        if (st === 'none' || state.bannerDismissed) {
          el.classList.remove('is-visible');
          return;
        }
        el.classList.add(st, 'is-visible');
        document.getElementById('hbText').textContent = st === 'risk'
          ? 'Você tem algo importante para resolver com o Radar de Caixa.'
          : 'Sua fatura fecha em breve — dá uma olhada rápida no Radar de Caixa.';
      }

      function renderPicker() {
        var st = alertState();
        var row = document.querySelector('.agent-row[data-open="radar"]');
        row.classList.toggle('has-bang', st === 'risk');
        row.classList.toggle('has-soft', st === 'reminder');
      }

      function openAgent(target) {
        state.scenario = target;
        if (target === 'radar') renderRadar();
        else if (target === 'onboarding') renderOnboarding();
        else if (target === 'faq') renderFaq();
        showScreen(target);
      }

      chatFab.addEventListener('click', function () {
        renderPicker();
        showScreen('picker');
      });

      document.querySelectorAll('.agent-row').forEach(function (row) {
        row.addEventListener('click', function () { openAgent(row.dataset.open); });
      });

      document.querySelectorAll('[data-go]').forEach(function (el) {
        el.addEventListener('click', function () {
          if (el.dataset.go === 'picker') renderPicker();
          showScreen(el.dataset.go);
        });
      });

      document.getElementById('hbGo').addEventListener('click', function () {
        state.scenario = 'radar';
        renderRadar();
        showScreen('radar');
      });
      document.getElementById('hbDismiss').addEventListener('click', function () {
        state.bannerDismissed = true;
        updateHomeBanner();
      });
      document.getElementById('showBannerBtn').addEventListener('click', function () {
        state.bannerDismissed = false;
        showScreen('home');
      });

      document.getElementById('scenarioSeg').addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-scenario]');
        if (!btn) return;
        document.querySelectorAll('#scenarioSeg button').forEach(function (b) { b.classList.remove('is-on'); });
        btn.classList.add('is-on');
        document.getElementById('radarControls').style.display = btn.dataset.scenario === 'radar' ? '' : 'none';
        openAgent(btn.dataset.scenario);
      });

      document.getElementById('severitySeg').addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-severity]');
        if (!btn) return;
        document.querySelectorAll('#severitySeg button').forEach(function (b) { b.classList.remove('is-on'); });
        btn.classList.add('is-on');
        state.severity = parseInt(btn.dataset.severity, 10);
        renderRadar();
      });

      function wireSwitch(id, key) {
        var el = document.getElementById(id);
        el.addEventListener('click', function () {
          state[key] = !state[key];
          el.classList.toggle('is-on', state[key]);
          state.bannerDismissed = false;
          renderRadar();
          updateHomeBanner();
        });
      }
      wireSwitch('toggleAlert', 'alertActive');
      wireSwitch('toggleResgate', 'hasResgate');
      wireSwitch('toggleNrest', 'nrestAlto');

      document.getElementById('faqSend').addEventListener('click', function () {
        var input = document.getElementById('faqInput');
        if (!input.value.trim()) return;
        faqAsk(input.value);
        input.value = '';
      });
      ['radarInput', 'faqInput'].forEach(function (id) {
        document.getElementById(id).addEventListener('keydown', function (e) {
          if (e.key === 'Enter') document.getElementById(id === 'radarInput' ? 'radarSend' : 'faqSend').click();
        });
      });

      // Estado via URL, só para tirar prints determinísticos do protótipo
      // (ex.: ?scenario=radar&severity=2&resgate=0&nrest=1&capture=1) — não afeta
      // o uso normal/interativo, que continua no estado padrão de sempre.
      function applyUrlState() {
        var q = new URLSearchParams(location.search);
        if (!q.toString()) { renderRadar(); showScreen('home'); return; }

        if (q.has('severity')) state.severity = parseInt(q.get('severity'), 10) || 0;
        if (q.has('resgate')) state.hasResgate = q.get('resgate') !== '0';
        if (q.has('nrest')) state.nrestAlto = q.get('nrest') !== '0';
        if (q.has('alert')) state.alertActive = q.get('alert') !== '0';

        document.querySelectorAll('#severitySeg button').forEach(function (b) {
          b.classList.toggle('is-on', parseInt(b.dataset.severity, 10) === state.severity);
        });
        document.getElementById('toggleAlert').classList.toggle('is-on', state.alertActive);
        document.getElementById('toggleResgate').classList.toggle('is-on', state.hasResgate);
        document.getElementById('toggleNrest').classList.toggle('is-on', state.nrestAlto);

        var scenario = q.get('scenario') || 'home';
        document.getElementById('radarControls').style.display = scenario === 'radar' ? '' : 'none';
        document.querySelectorAll('#scenarioSeg button').forEach(function (b) {
          b.classList.toggle('is-on', b.dataset.scenario === scenario);
        });

        state.bannerDismissed = !(q.get('banner') === '1');
        if (scenario === 'home') { showScreen('home'); }
        else { openAgent(scenario); }

        if (q.get('capture') === '1') document.body.classList.add('capture-mode');
      }
      applyUrlState();
    })();
  