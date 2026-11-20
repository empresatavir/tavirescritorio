# Ficha canônica — personagem virtual do piloto

> Template de planejamento · não contém imagem nem personagem aprovada
>
> Codinomes preservam a identidade da empresa até o intake privado. Não inserir dados pessoais,
> foto de referência humana, credencial ou material sem licença neste arquivo versionado.

## 1. Identificação e propriedade

- `character_id`: `char-fem-001`
- `character_version`: `0.1-draft`
- cliente autorizado: `Loja Piloto A`
- finalidade: conteúdo orgânico e criativos aprovados do piloto de moda feminina
- titular/licenciado do ativo final: `[DEFINIR NO CONTRATO]`
- exclusividade entre marcas: exclusiva para a loja-piloto por padrão
- prazo/território/canais: `[DEFINIR NO CONTRATO]`
- aviso editorial: `Modelo virtual criada com inteligência artificial.`

## 2. Princípios da identidade

- personagem original; não baseada em foto, nome ou história de pessoa real;
- aparência inequivocamente adulta;
- não imitar celebridade, influenciadora, funcionária, cliente ou concorrente;
- coerência com o posicionamento da loja, sem estereótipo ofensivo ou sexualização inadequada;
- identidade visual estável entre peças, poses, cenários e vídeos;
- transparência de que se trata de modelo virtual quando aplicável ao contexto.

## 3. Direção visual a aprovar com a loja

- faixa etária aparente adulta: `[DEFINIR]`
- tom e subtom de pele: `[DEFINIR]`
- formato do rosto: `[DEFINIR]`
- olhos: `[DEFINIR]`
- cabelo: `[DEFINIR]`
- tipo físico e proporções: `[DEFINIR]`
- altura aparente/enquadramento: `[DEFINIR]`
- maquiagem: `[DEFINIR]`
- atitude/expressão: `[DEFINIR]`
- linguagem corporal: `[DEFINIR]`
- atributos proibidos: aparência infantil, logos de terceiros, tatuagem identificável, texto gerado,
  anatomia impossível e alteração visual que deturpe a roupa.

## 4. Prancha-base S0

Gerar e aprovar no mínimo:

1. retrato frontal neutro;
2. perfil esquerdo e direito;
3. corpo inteiro frontal;
4. corpo inteiro em três quartos;
5. expressões neutra, sorriso leve e foco/editorial;
6. fundo simples, luz controlada e roupa-base sem marca.

Nenhuma prancha entra no try-on antes do gate `character_approved`.

## 5. Manifesto de proveniência

Para cada versão aprovada, registrar fora de campos públicos desnecessários:

- provedor e endpoint;
- modelo e versão;
- workflow/container versionado quando usar RunPod;
- prompt e negative prompt;
- seed e parâmetros quando suportados;
- data da geração;
- hashes das referências e saídas;
- termos/licença aplicáveis na data;
- revisão de semelhança evidente;
- aprovador e hash da prancha aprovada.

Segredos e tokens nunca entram no manifesto.

## 6. Critérios de aceite S0

- [ ] aparência adulta inequívoca;
- [ ] rosto e corpo reconhecíveis como a mesma personagem em todas as vistas;
- [ ] sem artefato anatômico crítico;
- [ ] sem semelhança evidente conhecida com pessoa real/celebridade após revisão razoável;
- [ ] direitos comerciais e retenção do fornecedor verificados;
- [ ] aviso editorial aprovado;
- [ ] personagem aprovada pela Loja Piloto A;
- [ ] `character_id`, versão e hashes congelados.

## 7. Limites

- revisão de semelhança reduz risco, mas não prova inexistência absoluta de pessoa parecida;
- personagem aprovada não garante fidelidade da roupa — isso pertence ao S1;
- não criar voz clonada, biografia falsa, depoimento falso ou alegação de experiência pessoal;
- não reaproveitar a personagem em outra marca sem autorização contratual;
- qualquer troca significativa de rosto/corpo cria nova versão e exige nova aprovação.
