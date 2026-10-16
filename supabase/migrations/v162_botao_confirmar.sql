-- v162 — quantas vezes o botão "Confirmar presença" vai, escolha do negócio
--
-- POR QUE (Eduardo, 16/10/2026)
-- O botão saía nos TRÊS avisos (confirmação, véspera e dia), e continuava
-- saindo depois de a pessoa já ter confirmado. Ela toca "Confirmar presença"
-- na véspera e no dia recebe o mesmo pedido de novo — parece descuido.
-- "acho que botão confirmar deve ir na primeira msg, mas não nas outras, e
-- isso deve virar decisão do dono".
--
-- O `message_rules.com_botao` (v127) tentava isso por aviso e não funcionava:
-- desligado, só deixava de mandar o payload — o botão faz parte do template
-- aprovado na Meta e aparecia igual. Agora, sem botão, o motor troca pro
-- template gêmeo SEM botões (mesmo corpo, byte a byte, conferido na Meta).
--
-- Valores:
--   nao            nenhuma mensagem leva o botão
--   primeira       só a primeira mensagem do horário leva; depois, nenhuma
--   ate_confirmar  vai em cada aviso até a pessoa confirmar
--   sempre         vai em todos, mesmo depois de confirmar (comportamento antigo)
--
-- 🔴 Quem JÁ existe fica em 'sempre' — é o que eles têm hoje, e mudança de
-- cliente é escolha dele. Só os negócios NOVOS nascem em 'primeira'.
-- Por isso as duas etapas: o ADD COLUMN com default preenche as linhas que
-- existem; o SET DEFAULT depois vale só pra quem entrar.

alter table businesses
  add column if not exists botao_confirmar text not null default 'sempre'
  check (botao_confirmar in ('nao', 'primeira', 'ate_confirmar', 'sempre'));

alter table businesses alter column botao_confirmar set default 'primeira';

comment on column businesses.botao_confirmar is
  'Quantas vezes o botão Confirmar presença vai: nao | primeira | ate_confirmar | sempre. Existentes = sempre (v162); novos = primeira.';

-- Se o aviso SAIU com o botão. É o que o modo 'primeira' conta: "já pedi
-- a confirmação deste horário?". Gravado só quando a Meta aceita o envio.
-- null = aviso de antes da v162, ou tipo que não tem o botão.
alter table message_log
  add column if not exists com_botao boolean;
