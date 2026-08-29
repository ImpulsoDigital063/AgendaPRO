-- v145 · Grade na home da profissional, sem depender de poder marcar
--
-- A grade no painel da profissional existe desde a v98d, mas ligada em
-- `professionals_can_book_self` — a MESMA chave que dá autonomia pra marcar.
-- No Studio Isis Melo a dona tirou o marcar (item 2 do setup) e a grade foi
-- junto: quem podia ver a agenda passou a ver a lista antiga.
--
-- Ver a agenda e poder marcar são decisões diferentes. Esta chave separa as
-- duas: com ela ligada, quem tem `professionals.ve_agenda` vê a GRADE (padrão
-- visual do /admin e do balcão), possa marcar ou não. Quem não pode marcar vê
-- a grade sem os botões de ação — enxerga o dia, não mexe nele.
--
-- Default false porque isso troca a home de quem já usa o sistema: negócio que
-- não pedir continua com a lista de sempre. Liga negócio a negócio.
--
-- Idempotente.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS prof_grade_home boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.prof_grade_home IS
  'true = profissional com ve_agenda enxerga a GRADE na home dela, mesmo sem poder marcar. false (padrao) = lista antiga, ou grade so com professionals_can_book_self como sempre foi.';
