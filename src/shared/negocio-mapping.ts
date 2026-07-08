// Mapeamento entre códigos numéricos de negócio e nomes
export const NEGOCIO_CODIGO_TO_NOME: { [key: string]: string } = {
  '10': 'Salmix B2B',
  '36': 'Ruminantes',
  '42': 'Ave/Sui'
};

export const NEGOCIO_NOME_TO_CODIGO: { [key: string]: string } = {
  'Salmix B2B': '10',
  'Ruminantes': '36',
  'Ave/Sui': '42'
};

// Vendedores por código de negócio
export const VENDEDORES_POR_NEGOCIO: { [key: string]: string[] } = {
  '10': ['1001'],
  '36': ['15', '21', '23', '25', '27', '28', '3601', '3602', '3603', '3604', '3633'],
  '42': ['4201', '4202', '4203', '4222', '4231']
};

// Normalizar nome ou código de negócio para o nome padrão usado no banco
export function normalizarNegocio(negocioInput: string | null | undefined): string | null {
  if (!negocioInput) return null;
  
  const input = negocioInput.toString().trim();
  
  // Se já é um nome válido, retornar
  if (NEGOCIO_NOME_TO_CODIGO[input]) {
    return input;
  }
  
  // Se é um código, converter para nome
  if (NEGOCIO_CODIGO_TO_NOME[input]) {
    return NEGOCIO_CODIGO_TO_NOME[input];
  }
  
  // Retornar como está se não encontrou mapeamento
  return input;
}

// Obter código de negócio a partir do nome ou código
export function obterCodigoNegocio(negocioInput: string | null | undefined): string | null {
  if (!negocioInput) return null;
  
  const input = negocioInput.toString().trim();
  
  // Se já é um código válido, retornar
  if (NEGOCIO_CODIGO_TO_NOME[input]) {
    return input;
  }
  
  // Se é um nome, converter para código
  if (NEGOCIO_NOME_TO_CODIGO[input]) {
    return NEGOCIO_NOME_TO_CODIGO[input];
  }
  
  // Retornar null se não encontrou mapeamento
  return null;
}

// Verificar se um vendedor pertence a um negócio
export function vendedorPertenceAoNegocio(vendedor: string, negocio: string): boolean {
  const codigo = obterCodigoNegocio(negocio);
  if (!codigo) return false;
  
  const vendedores = VENDEDORES_POR_NEGOCIO[codigo];
  return vendedores ? vendedores.includes(vendedor) : false;
}
