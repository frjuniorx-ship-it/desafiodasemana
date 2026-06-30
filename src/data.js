export const npcs = [
  { id:'cururu', name:'Cururu', theme:'Anfíbios', flavor:'Mestre da paciência, aguarda no esquecimento.', color:'#5a8a4a', accent:'#3a6a3a', portrait:'#2a3e22', state:'won', date:'12 jun', initial:'C' },
  { id:'iara', name:'Iara das Águas', theme:'Rio & Cantos', flavor:'Encanta e arrasta ao leito profundo.', color:'#4a7aa8', accent:'#2a5a88', portrait:'#1f3a52', state:'won', date:'18 jun', initial:'I' },
  { id:'saci', name:'Saci-Pererê', theme:'Ventos da Mata', flavor:'Confunde, rouba e some no redemoinho.', color:'#8a4a2a', accent:'#6a3a1a', portrait:'#3a1e12', state:'won', date:'24 jun', initial:'S' },
  { id:'boitata', name:'Boitatá', theme:'Serpentes & Fogo', flavor:'A serpente-fogo cobra dos que queimam a mata.', color:'#c84d2a', accent:'#a8351a', portrait:'#3a1e12', state:'available', initial:'B' },
  { id:'curupira', name:'Curupira', theme:'Guardiões da Mata', flavor:'Pés ao contrário, despista o invasor por dias.', color:'#3a7a4a', accent:'#1f5a2a', portrait:'#1a3a22', state:'locked', initial:'?' },
  { id:'maeouro', name:'Mãe-do-Ouro', theme:'Governantes & Cobiça', flavor:'Brilha sobre os incautos como sentença.', color:'#c89b3c', accent:'#8a5d1f', portrait:'#3a2a12', state:'locked', initial:'?' },
  { id:'anhanga', name:'Anhangá', theme:'Caçadores da Sombra', flavor:'Caça aqueles que caçam por nada.', color:'#6a4a8a', accent:'#4a2a6a', portrait:'#251a3a', state:'locked', initial:'?' },
  { id:'aves', name:'Conselho das Aves', theme:'Aves & Augúrios', flavor:'Vêem o turno seguinte antes de você jogar.', color:'#d4a857', accent:'#8a6a2a', portrait:'#3a2a12', state:'locked', initial:'?' },
];

export const battleCards = {
  pChar0: { name:'José de Anchieta', category:'Personagem', cost:3, atk:4, def:5, rarity:3, effect:'Quando entra em campo, escolha uma Planta da sua mão e pague 1 a menos para invocá-la neste turno.', lore:'Jesuíta-poeta que aprendeu o tupi nas areias e escrevia sobre a Virgem na maré baixa.' },
  pChar1: { name:'Marlene da Mata', category:'Personagem', cost:2, atk:3, def:3, rarity:2, effect:'Enquanto houver uma Planta sua em campo, +1 ATQ. Imune a efeitos de Folclóricas com custo 1.', lore:'Seringueira do Acre que aprendeu, na infância, a ler os passos do mato como quem lê um salmo.' },
  pChar2: { name:'Tibiriçá', category:'Personagem', cost:4, atk:6, def:4, rarity:4, effect:'Ao atacar: revele a carta do topo da Mão do oponente. Se for Folclórica, ele a descarta no Esquecimento.', lore:'Cacique tupiniquim que escolheu seus aliados duas vezes — e fundou Piratininga sobre a colina.' },
  pPlant0: { name:'Ipê-amarelo', category:'Planta', cost:1, rarity:2, effect:'No início do seu turno, ganhe +1 PC. Dura 3 turnos antes de florescer e ir para o Esquecimento.', lore:'Quando floresce na seca, a mata inteira reconhece: ainda vale a pena.' },
  pPlant1: { name:'Jequitibá', category:'Planta', cost:3, rarity:3, effect:'Personagens seus em campo ganham +1 DEF. Não pode ser alvo de efeitos de Ação do oponente.', lore:'Os mais antigos atravessaram impérios. Quando caem, é por escolha — não por idade.' },
  npcChar0: { name:'Cuca', category:'Personagem', cost:3, atk:3, def:4, rarity:3, effect:'A cada turno do oponente, ele descarta a carta mais antiga da mão para o Esquecimento.', lore:'Velha de cabelo branco e sorriso de jacaré: quem dorme cedo, ela esquece. Quem dorme tarde, ela lembra.' },
  npcChar1: { name:'Mula-sem-Cabeça', category:'Personagem', cost:4, atk:5, def:2, rarity:3, effect:'Investida: pode atacar no mesmo turno em que entra. Se destruir um alvo, atinge a Planta atrás dele.', lore:'Galopa em noites de sexta-feira pelas estradas da fé quebrada, ferraduras em brasa.' },
  npcChar3: { name:'Lobisomem', category:'Personagem', cost:5, atk:4, def:3, rarity:3, effect:'À noite (turnos pares): +2 ATQ e cura 1 PC para o controlador ao causar dano.', lore:'Sétimo filho homem, marcado pela lua. A própria sombra recua de vergonha.' },
  npcPlant0: { name:'Pequi', category:'Planta', cost:2, rarity:2, effect:'Personagens do oponente que atacam esta linha perdem 1 ATQ até o fim do turno.', lore:'O caroço é doce — mas tem espinhos. Quem morde apressado, lembra depois.' },
  npcPlant2: { name:'Mandacaru', category:'Planta', cost:1, rarity:1, effect:'Resiste à primeira destruição. Quando flore, dá uma carta do baralho ao controlador.', lore:'No sertão, floresce quando todos juraram que ali já não nascia nada.' },
  reveal1: { name:'Boto-cor-de-rosa', category:'Personagem', cost:3, atk:2, def:3, rarity:3, effect:'Ao entrar em campo, sequestra um Personagem com custo ≤2 da mão do oponente até o fim do turno.', lore:'Dança no salão como gente. Volta para o rio antes do galo cantar.' },
  reveal2: { name:'Círculo de Fogo', category:'Folclórica', cost:4, nd:7, rarity:4, effect:'Cause 2 de dano em PC ao oponente. Se houver Planta seca em campo, cause 3.', lore:'O Boitatá não morde. Ele cerca. E quando o círculo fecha, ninguém escapa pela mata.' },
};

export const initialChat = [
  { kind:'system', text:'Você jogou Tibiriçá no campo central (3º espaço).' },
  { kind:'player', text:'Vale a pena ativar Marlene se ele tem o Círculo de Fogo na mão?' },
  { kind:'ai', text:'Marlene é imune a Folclóricas de custo 1, mas o Círculo custa 4. Considere recuar a Planta antes de ativar — o ATQ extra ainda compensa.' },
  { kind:'system', text:'Boitatá revelou Boto-cor-de-rosa por "Índio Curioso".' },
];

export const battleLog = [
  { t:'T07', text:'Boitatá ativou "Círculo de Fogo" — −2 PC para Aurélio.', color:'#e8a890' },
  { t:'T07', text:'Você invocou Tibiriçá no campo central.', color:'#c8e8a8' },
  { t:'T06', text:'NPC moveu Mula-sem-Cabeça para a linha de frente.', color:'#a89870' },
];
