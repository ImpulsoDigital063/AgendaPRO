-- v146 · A cliente disse que pagou. O relógio para; o dinheiro NÃO é confirmado.
--
-- O que ainda falhava depois do v139/v140: a trava de soltar o horário olhava
-- só pro lado da DONA (ela foi avisada? passou a folga de 30 min?). O lado da
-- CLIENTE não entrava na conta. Então:
--
--   10h00  aviso sai pra dona          sinal_aviso_enviado_at = 10h00
--   10h20  cliente responde "Já paguei" (dona notificada, nada gravado)
--   10h31  folga vence → horário SOLTO por cima de um PIX declarado
--
-- É o incidente da Ariadne (26/08) com um passo a mais: dessa vez a cliente
-- avisou, e o sistema soltou mesmo assim. Um horário que volta pra agenda
-- depois da cliente dizer "paguei" é venda dobrada esperando pra acontecer.
--
-- Esta coluna NÃO é prova de pagamento e não pode virar uma. O PIX do sinal é
-- BRCode estático na chave da própria dona — o sistema não escuta a conta e
-- não tem como saber que caiu. Quem confirma dinheiro é ela, olhando o
-- extrato, no botão "Recebi o sinal". Aqui só registramos que a cliente
-- afirmou ter pago, com hora.
--
-- Por que parar o relógio sem prazo novo em vez de dar mais 30 min: qualquer
-- prazo que a gente inventasse aqui voltaria a soltar o horário sozinho, que é
-- justamente o que não pode. A válvula de saída existe e é manual — a aba
-- Sinal tem 'cancelar', e a dona cai lá pelo push que este mesmo fluxo
-- dispara. Segue o lado certo pra errar do v140: o sistema erra segurando
-- horário, nunca vendendo duas vezes o mesmo.
--
-- Abuso possível (cliente escreve "paguei" e trava o horário de graça): existe,
-- é barato de reverter num clique, e some quando o sinal passar por um
-- provedor que a gente escute (decisão do Asaas, em aberto).

alter table public.appointments
  add column if not exists sinal_declarado_em timestamptz;

comment on column public.appointments.sinal_declarado_em is
  'Quando a CLIENTE afirmou ter pago o sinal ("Já paguei" no WhatsApp). Para o relógio de expiração. NÃO é prova de pagamento — quem confirma dinheiro é sinal_pago_at — v146.';

-- A aba Sinal lista os pendentes do negócio por data e agora destaca quem
-- declarou pagamento. Índice parcial pelo mesmo motivo do v139: sem ele a
-- listagem varre a tabela inteira.
create index if not exists idx_appointments_sinal_declarado
  on public.appointments (business_id, appointment_date)
  where status = 'pending'
    and sinal_declarado_em is not null
    and sinal_pago_at is null;
