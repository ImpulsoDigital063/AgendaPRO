-- v122 · rodapé de marca da ficha impressa (09/08/2026)
--
-- A ficha impressa sai da clínica e vai pra mão da paciente. A faixa de topo
-- (logo + cor) já dá pra montar com o que existe em businesses; o que faltava
-- era o RODAPÉ, que é texto e varia por profissão:
--   linha → contato como o negócio quer assinar o documento
--   nota  → linha de conformidade (conselho de classe, ANVISA, LGPD)
--
-- É texto livre por negócio de propósito: cravar um texto único imprimiria
-- conselho de classe errado no documento de alguém. Barbearia não tem CFBio.
-- Quando é null, o PDF monta o contato sozinho com nome + telefone + endereço.

alter table businesses add column if not exists ficha_rodape jsonb;

comment on column businesses.ficha_rodape is
  'Rodapé da ficha impressa: {"linha": contato, "nota": conformidade}. Null = monta de name/phone/address.';

-- Serenity Clínica Integrada — reproduz o rodapé do kit de papel dela.
-- TELEFONE: o kit impresso traz "(45) 9997-12371", que não fecha como número
-- brasileiro (hífen no lugar errado). Usado aqui o do cadastro dela no
-- sistema, (45) 99971-2371, que é o que a paciente consegue discar.
update businesses set ficha_rodape = jsonb_build_object(
  'linha', 'Dra. Elaine Rebolo  |  Tel: (45) 99971-2371  |  elaine_oliveirarebolo@hotmail.com  |  Av. Desembargador Munhoz de Melo, 156',
  'nota',  'Documento emitido em conformidade com as normativas do CFBio, ANVISA e legislação vigente de proteção ao paciente (LGPD – Lei 13.709/2018).'
) where slug in ('serenityclinicaintegrada', 'clinica-teste-fichas');
