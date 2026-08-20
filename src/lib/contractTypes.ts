// Tipos (departamentos) de contrato e as áreas de cada um.
// A opção "Outros" libera texto livre no campo de área.

export const CONTRACT_TYPES = [
  'T.I.',
  'Marketing',
  'RH',
  'Financeiro',
  'Jurídico',
  'Operações',
  'Comercial',
  'Facilities',
  'Outros',
] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number];

export const AREAS_BY_TYPE: Record<string, string[]> = {
  'T.I.': [
    'Suporte',
    'Infraestrutura',
    'Redes',
    'Cloud',
    'Desenvolvimento',
    'Segurança da Informação',
    'Banco de Dados',
    'Telefonia',
    'Help Desk',
  ],
  Marketing: [
    'Mídia Paga',
    'SEO',
    'Redes Sociais',
    'Branding',
    'Conteúdo',
    'Design',
    'Eventos',
    'Assessoria de Imprensa',
  ],
  RH: [
    'Recrutamento e Seleção',
    'Folha de Pagamento',
    'Treinamento',
    'Benefícios',
    'Departamento Pessoal',
    'Saúde Ocupacional',
  ],
  Financeiro: [
    'Contabilidade',
    'Contas a Pagar',
    'Contas a Receber',
    'Auditoria',
    'Planejamento Financeiro',
    'Cobrança',
  ],
  Jurídico: [
    'Contratos',
    'Trabalhista',
    'Tributário',
    'Compliance',
    'Societário',
    'Propriedade Intelectual',
  ],
  Operações: ['Logística', 'Manutenção', 'Produção', 'Qualidade', 'Suprimentos', 'Estoque'],
  Comercial: ['Vendas', 'Pós-venda', 'Atendimento', 'CRM', 'Parcerias'],
  Facilities: ['Limpeza', 'Segurança Patrimonial', 'Manutenção Predial', 'Copa', 'Transporte'],
  Outros: [],
};
