/* ===================== Pixel Swarm — level pictures =====================
   One picture per level, no repeats. Each picture is a grid of color letters (see PALETTE in js/data.js,
   '.' = empty / background). Easy and Medium pictures are 12x12; Hard pictures are 18x18 for more detail.
   PS_LEVELS lists the pictures of each theme by difficulty (6 per difficulty) and the 12 event levels.
   Check them with: node tools/check-pictures.mjs all preview.png
*/
window.PS_PICTURES = {
  // ---------------- FLOWERS ----------------
  sunflower: { name: 'Sunflower', grid: [
    '....yyyy....', '..yyyyyyyy..', '.yyynnnnyyy.', '.yynnNNnnyy.', 'yyynNnnNnyyy', 'yyynNnnNnyyy',
    '.yynnNNnnyy.', '.yyynnnnyyy.', '..yyyyyyyy..', '.....gg.....', '...GGgg.GG..', '.....ggGG...'] },
  daisy: { name: 'Daisy', grid: [
    '....ww.ww...', '...wwwwwww..', '.ww.wwwww.ww', '.wwwwyywwww.', 'wwwwyyyywwww', '.wwwyyyywww.',
    '.wwwwyywwww.', '.ww.wwwww.ww', '...wwwwwww..', '.....gg.....', '...GGgg.....', '.....gg.....'] },
  cactusflower: { name: 'Cactus Flower', grid: [
    '.....pp.....', '....pPPp....', '.....pp.....', '.....gg.....', '..g..gGg....', '.gg..gGg.g..',
    '.g...gGg.gg.', '.ggggGGg..g.', '.....gGggg..', '...nnnnnn...', '...nnnnnn...', '....nnnn....'] },
  violet: { name: 'Violet', grid: [
    '...vv..vv...', '..vvvvvvvv..', '..vvvyyvvv..', '.vvvyyyyvvv.', '.vvvyyyyvvv.', '..vvvyyvvv..',
    '..vvvvvvvv..', '...vv..vv...', '.....gg.....', '.GG..gg..GG.', '..GGGggGGG..', '.....gg.....'] },
  rose: { name: 'Rose', grid: [
    '....rrrr....', '..rrRRrrrr..', '.rrRrrrRrrr.', '.rRrrRRrrRr.', '.rrRrrrrRrr.', '..rrRRRRrr..',
    '...rrrrrr...', '.....gg.....', '..GGggg.....', '...GGgg.gg..', '.....ggGG...', '.....gg.....'] },
  lotus: { name: 'Lotus', grid: [
    '.....pp.....', '....pPPp....', '..p.pPPp.p..', '.ppppPPpppp.', '.pPPpPPpPPp.', '..ppPPPPpp..',
    '...pppppp...', '.bbbggggbbb.', 'bBbbgGGgbbBb', 'bbbbbbbbbbbb', '.bBbbbbbbBb.', '............'] },
  lavender: { name: 'Lavender', grid: [
    '..v...v...v.', '.vvv.vvv.vvv', '..v...v...v.', '.vvv.vvv.vvv', '..v...v...v.', '.vvv.vvv.vvv',
    '..g...g...g.', '..g...g...g.', '...g..g..g..', '....yyyyy...', '.....ggg....', '.....g.g....'] },
  pottedflower: { name: 'Potted Flower', grid: [
    '....oooo....', '...oOnnOo...', '...onnnno...', '...oOnnOo...', '....oooo....', '.....gg.....',
    '..GG.gg.GG..', '...GGggGG...', '..nnnnnnnn..', '..NNNNNNNN..', '...nnnnnn...', '...nnnnnn...'] },
  poppy: { name: 'Poppy', grid: [
    '..rr....rr..', '.rRRr..rRRr.', '.rRRRrrRRRr.', '..rRRkkRRr..', '...rkkkkr...', '..rRRkkRRr..',
    '.rRRRrrRRRr.', '.rRRr..rRRr.', '..rr.gg.rr..', '.....gg.....', '...GGgg.....', '.....gg.....'] },
  sakura: { name: 'Cherry Blossom', grid: [
    '.....PP.....', '....PppP....', '.PP.PppP.PP.', 'PppPPPPPPppP', 'PpppPyyPpppP', '.PPPyyyyPPP.',
    '..PPPyyPPP..', '..PpPPPPpP..', '.PppP..PppP.', '.PPP....PPP.', '............', '............'] },
  bouquet: { name: 'Bouquet', grid: [
    '..................', '....rrr....yyy....', '...rrRrr..yynyy...', '...rRRRr..ynnny...', '...rrRrr..yynyy...',
    '....rrr.pp.yyy.vv.', '.bb...g.pppp.g.vvv', 'bbbb..g.pppp.gvvvv', '.bb.g.g..pp.g..vv.', '....g.gg.g..g.g...',
    '.....g.gggggg.g...', '......gggggggg....', '......NnNnNnNn....', '......nNnrrnNn....', '.......NnrrnN.....',
    '.......nNnNnN.....', '........NnNn......', '.........nN.......'] },
  tulipbox: { name: 'Tulip Box', grid: [
    '..................', '..................', '..r..r.p..p.y..y..', '..rrrr.pppp.yyyy..', '..rRrr.pPpp.ynyy..',
    '..rrrr.pppp.yyyy..', '...rr...pp...yy...', '....g....g....g...', '...Gg....gG...gG..', '...Gg....gG...gG..',
    '....g....g....g...', '.nnnnnnnnnnnnnnnn.', '.nNNNNNNNNNNNNNNn.', '.nNnnnnnnnnnnnnNn.', '.nNNNNNNNNNNNNNNn.',
    '.nnnnnnnnnnnnnnnn.', '..n.............n.', '..................'] },
  orchid: { name: 'Orchid', grid: [
    '..................', '......vvvvvv......', '.....vPPPPPPv.....', '.....vPPPPPPv.....', '..vvv.vPPPPv.vvv..',
    '.vPPPv.vvvv.vPPPv.', 'vPPPPPvyyyyvPPPPPv', 'vPPPPPyykkyyPPPPPv', '.vPPPvyyyyyyvPPPv.', '..vvv.vpppppv.vvv.',
    '.....vpPPPPpv.....', '.....vpPPPPpv.....', '......vppppv......', '.......vvvv.......', '........gg........',
    '..GG....gg....GG..', '...GGgggggggggG...', '.....GGgggggG.....'] },
  dandelions: { name: 'Dandelions', grid: [
    '..................', '....w.w.w.........', '...w.www.w........', '..w.wwwww.w.......', '...wwwswww........',
    '..w.wwwww.w..yy...', '...w.www.w..yyyy..', '....w.g.w..yyyyyy.', '......g.....yyyy..', '......g......yy...',
    '......g......g....', '......g.....gg....', '.....Gg......g....', '......g......gG...', '......gG.....g....',
    '..g...g...g..g..g.', '.gGg.gGg.gGg.gGgGg', 'gggggggggggggggggg'] },
  wreath: { name: 'Flower Wreath', grid: [
    '.......gggg.......', '.....ggGrrGgg.....', '....gGrRRrGGgg....', '...gGGrrrGgyyGg...', '..ggG.gg..gyYyGg..',
    '..gG.......gyyGg..', '.gpp.........GGg..', '.gpPp.........Gg..', '.gpppg........ggg.', '.gGpg........vvGg.',
    '.ggGg.......vPPvg.', '..gGg.......vvvGg.', '..ggGg.....gGvGg..', '...ggGGgggGGggg...', '....ggGrrGGgg.....',
    '.....ggRrrgg......', '.......gggg.......', '..................'] },
  butterflyflower: { name: 'Butterfly Garden', grid: [
    '..................', '.bb.........bb....', 'bBBb..k.k..bBBb...', 'bBwBb..k..bBwBb...', 'bBBBbbkkkbbBBBb...',
    '.bBBBbkkkbBBBb....', '..bbbbkkkbbbb.....', '..bBBb.k.bBBb.....', '..bbb.....bbb.....', '..................',
    '.......pp..pp.....', '......pPPppPPp....', '......pPPyyPPp....', '.......ppyyppg....', '......pPPppPPpg...',
    '.......pp.gpp.g...', '.........gg..gg...', '..........g...g...'] },
  // ---------------- FRUITS ----------------
  banana: { name: 'Banana', grid: [
    '..........n.', '.........yy.', '........yyy.', '.......yyyy.', '......yyyyy.', '....yyyyyyy.',
    '..yyyyyyyy..', 'nyyyyyyyy...', '.yyyyyyy....', '..yyyy......', '............', '............'] },
  pear: { name: 'Pear', grid: [
    '.....n......', '.....ngg....', '....GGG.....', '....GGG.....', '...GGGGG....', '...GGGGg....',
    '..GGGGGGg...', '.GGGGGGGgg..', '.GGGGGGGgg..', '.GGGGGGGgg..', '..GGGGGgg...', '....ggg.....'] },
  strawberry: { name: 'Strawberry', grid: [
    '....g..g....', '...gggggg...', '..rrgggrr...', '.rrrrrrrrrr.', '.rYrrrYrrYr.', '.rrrrYrrrrr.',
    '..rYrrrrYr..', '..rrrrYrrr..', '...rYrrrr...', '....rrrr....', '.....rr.....', '............'] },
  lemon: { name: 'Lemon', grid: [
    '.......gg...', '......gGg...', '....yyyy....', '..yyyyyyyy..', '.yyyyyyyyyy.', 'yyyyyyyyyyyy',
    'yyyyyyyyyyyy', '.yyyyyyyyyy.', '..yyyyyyyy..', '....yyyy....', '............', '............'] },
  orangeslice: { name: 'Orange Slice', grid: [
    '...zzzzzz...', '.zzOOOOOOzz.', '.zOOOwwOOOz.', 'zOwOOwwOOwOz', 'zOOwOwwOwOOz', 'zOOOwwwwOOOz',
    'zOOOwwwwOOOz', 'zOOwOwwOwOOz', 'zOwOOwwOOwOz', '.zOOOwwOOOz.', '.zzOOOOOOzz.', '...zzzzzz...'] },
  grapes: { name: 'Grapes', grid: [
    '......n.....', '.....n.gg...', '..vvvvvgGg..', '.vPvvPvvvv..', '.vvvvvvvPv..', '..vPvvPvvv..',
    '..vvvvvvvv..', '...vPvvPv...', '...vvvvvv...', '....vPvv....', '.....vv.....', '............'] },
  watermelon: { name: 'Watermelon', grid: [
    'gggggggggggg', '.GGGGGGGGGG.', '.rrrrrrrrrr.', '..rrkrrkrr..', '..rrrrrrrr..', '...rkrrkr...',
    '...rrrrrr...', '....rkrr....', '....rrrr....', '.....rr.....', '............', '............'] },
  pineapple: { name: 'Pineapple', grid: [
    '....g..g....', '...gGggGg...', '....gGGg....', '.....gg.....', '...yyyyyy...', '..yoyyoyyo..',
    '..yyoyyoyy..', '..yoyyoyyo..', '..yyoyyoyy..', '..yoyyoyyo..', '...yyyyyy...', '............'] },
  peach: { name: 'Peach', grid: [
    '.....n......', '....nGG.....', '..OOO.ppp...', '.OOOOOpppp..', 'OOOOOOOpppp.', 'OOOOOOppppp.',
    'OOOOOOppppp.', 'OOOOOOOpppp.', '.OOOOOpppp..', '..OOOOppp...', '....OOp.....', '............'] },
  kiwi: { name: 'Kiwi', grid: [
    '....nnnn....', '..nnggggnn..', '.nggGGGGggn.', '.ngGkGGkGgn.', 'nggGGwwGGggn', 'ngGkGwwGkGgn',
    'ngGkGwwGkGgn', 'nggGGwwGGggn', '.ngGkGGkGgn.', '.nggGGGGggn.', '..nnggggnn..', '....nnnn....'] },
  fruitbasket: { name: 'Fruit Basket', grid: [
    '..................', '..................', '......vvv.........', '.....vPvvv..gg....', '..rr.vvvPv.ggG....',
    '.rrrr.vvv.oooo....', '.rrrr..y.ooooo....', '..rr..yy.oooooyy..', 'nnnnnnnnnnnnnnnnnn', 'nNnNnNnNnNnNnNnNnN',
    '.NnNnNnNnNnNnNnNn.', '.nNnNnNnNnNnNnNnN.', '..NnNnNnNnNnNnNn..', '..nNnNnNnNnNnNnN..', '...NnNnNnNnNnNn...',
    '....nnnnnnnnnn....', '..................', '..................'] },
  avocado: { name: 'Avocado', grid: [
    '..................', '.......gggg.......', '......gGGGGg......', '.....gGYYYYGg.....', '....gGYYYYYYGg....',
    '...gGYYYYYYYYGg...', '...gGYYYnnYYYGg...', '..gGYYYnNNnYYYGg..', '..gGYYnNNNNnYYGg..', '..gGYYnNNNNnYYGg..',
    '..gGYYnNNNNnYYGg..', '..gGYYYnNNnYYYGg..', '..gGYYYYnnYYYYGg..', '...gGYYYYYYYYGg...', '....gGYYYYYYGg....',
    '.....ggGGGGgg.....', '.......gggg.......', '..................'] },
  appletree: { name: 'Apple Tree', grid: [
    '....gggggggggg....', '..ggGgggrgggGgg...', '.ggrgggGgggggrgg..', '.gGggggggrggggGg..', 'ggggrgGggggggggrgg',
    '.ggggggggGgggrggg.', '.ggrgggGgggggggg..', '..gggggrgggGggg...', '....ggggggggg.....', '.......nnn........',
    '.......nNn........', '.......nnn........', '.......nNn........', '......nnnnn.......', '.....nn...nn......',
    '...rr...........r.', '..gGgggggGgggggGgg', 'gggggggggggggggggg'] },
  blueberries: { name: 'Blueberry Bowl', grid: [
    '..................', '..................', '..................', '.....b.bb.b.......', '....bBbbBbbBb.....',
    '...bbBbbbbBbbb....', '..bbbbbBbbbbbbb...', '.wwwwwwwwwwwwwwww.', '.wppwppwppwppwppw.', '..wwwwwwwwwwwwww..',
    '...wwwwwwwwwwww...', '....wwwwwwwwww....', '.....wwwwwwww.....', '.......ssss.......', '..................',
    '..................', '..................', '..................'] },
  dragonfruit: { name: 'Dragon Fruit', grid: [
    '.......gg..gg.....', '......gGgggGg.....', '....pppppppppp....', '...pwwwwwwwwwwp...', '..pwwkwwwwwkwwwp..',
    '.pwwwwwwkwwwwwkwp.', '.pwkwwwwwwwkwwwwp.', 'pwwwwwkwwwwwwkwwwp', 'pwwkwwwwwkwwwwwwwp', 'pwwwwwwkwwwwkwwwwp',
    '.pwwkwwwwwwwwwkwp.', '.pwwwwwkwwkwwwwwp.', '..pwwwwwwwwwwkwp..', '...pwkwwwwkwwwp...', '....pppppppppp....',
    '.....g.gggg.g.....', '......gg..gg......', '..................'] },
  coconutpalm: { name: 'Coconut Palm', grid: [
    '..................', '....gg.....gg.....', '..ggGgg..ggGggg...', '.gG...gggg....Gg..', '.g...ggGGgg.....g.',
    '....gG.nn.Gg......', '...g...nnn..g.....', '......nNnnn.......', '.......nN.........', '.......Nn.........',
    '........nN........', '........Nn........', '.........nN.......', '.........Nn.......', '.......yyyyyy.....',
    '....yyyyyyyyyyyy..', '.bbbbbbbbbbbbbbbbb', 'bBbbbBbbbBbbbBbbbb'] },
  // ---------------- ANIMALS ----------------
  puppy: { name: 'Puppy', grid: [
    '............', '.nn......nn.', 'nnnwwwwwwnnn', 'nnwwwwwwwwnn', 'nnwkwwwwkwnn',
    '.nwwwwwwwwn.', '..wwwkkwww..', '..wwwkkwww..', '...wwppww...', '....wppw....',
    '............', '............'] },
  bunny: { name: 'Bunny', grid: [
    '..www..www..', '..wPw..wPw..', '..wPw..wPw..', '..wPw..wPw..', '..wwwwwwww..',
    '.wwwwwwwwww.', '.wwkwwwwkww.', '.wwwwppwwww.', '.wPwwwwwwPw.', '..wwwwwwww..',
    '...wwwwww...', '............'] },
  frog: { name: 'Frog', grid: [
    '............', '..gg....gg..', '.gwwg..gwwg.', '.gwkg..gkwg.', 'gggggggggggg',
    'gGggggggggGg', 'ggkkkkkkkkgg', '.gggggggggg.', '..gGggggGg..', '.gg.gggg.gg.',
    'gg..g..g..gg', '............'] },
  pig: { name: 'Piglet', grid: [
    '............', '.pp......pp.', '.pPp....pPp.', '.PPPPPPPPPP.', 'PPPPPPPPPPPP',
    'PPkPPPPPPkPP', 'PPPPppppPPPP', 'PPPpkppkpPPP', 'PPPPppppPPPP', '.PPPPPPPPPP.',
    '..PPPPPPPP..', '............'] },
  fox: { name: 'Fox', grid: [
    'o..........o', 'oo........oo', 'owo......owo', 'owoooooooowo', 'oooooooooooo',
    'ookooooookoo', 'wwooooooooww', '.wwwwkkwwww.', '..wwwwwwww..', '...wwwwww...',
    '....wwww....', '............'] },
  panda: { name: 'Panda', grid: [
    '............', '.kk......kk.', 'kkkkwwwwkkkk', 'kkwwwwwwwwkk', '.wwwwwwwwww.',
    'wkkkwwwwkkkw', 'wkwkwwwwkwkw', 'wkkkwwwwkkkw', 'wwwwkkkkwwww', '.wPwwwwwwPw.',
    '..wwwkkwww..', '...wwwwww...'] },
  owl: { name: 'Owl', grid: [
    '..n......n..', '..nn....nn..', '..nnnnnnnn..', '.nwwwnnwwwn.', '.nwkwnnwkwn.',
    '.nwwwoowwwn.', '.nnnnoonnnn.', '.nNNnnnnNNn.', '.nNNNnnNNNn.', '.nnNNNNNNnn.',
    '...oo..oo...', 'nnnnnnnnnnnn'] },
  mouse: { name: 'Mouse', grid: [
    '............', '.ss......ss.', 'sPPs....sPPs', 'sPPs....sPPs', '.sSSSSSSSSs.',
    'sSSSSSSSSSSs', 'sSkSSSSSSkSs', 'sSSSSSSSSSSs', '.SSSSppSSSS.', '..SSSSSSSS..',
    '....SSSS....', '............'] },
  bear: { name: 'Bear', grid: [
    '.nn......nn.', 'nNNn....nNNn', 'nNnnnnnnnnNn', '.nnnnnnnnnn.', 'nkknnnnnnkkn',
    'nkknnnnnnkkn', 'nnnNNNNNNnnn', 'nnNNkkkkNNnn', 'nnNNNkkNNNnn', '.nnNNNNNNnn.',
    '..nnnnnnnn..', '...nnnnnn...'] },
  cow: { name: 'Cow', grid: [
    '.N........N.', '.NN......NN.', 'kkwwwwwwwwkk', '.kwwkkkkwwk.', '..wkkkkkkw..',
    '..wkwwwwkw..', '..wwwwwwww..', '.PPPPPPPPPP.', '.PPkPPPPkPP.', '.PPPPPPPPPP.',
    '..PPPPPPPP..', '............'] },
  lion: { name: 'Lion', grid: [
    '.....nnnnnnnn.....', '...nnnonoononnn...', '..nnonnnnnnnnonn..', '.nonnnyyyyyynnnon.', '.nonnyyyyyyyynnon.',
    'nnonyyyyyyyyyynonn', 'nonyyykyyyykyyynon', 'nnnyyyyyyyyyyyynnn', 'nonyyyyyyyyyyyynon', 'nonyyyykkkkyyyynon',
    'nnnyyyyykkyyyyynnn', '.nonyykyyyykyynon.', '.nnnnyyyyyyyynnnn.', '..nonnyyyyyynnon..', '...nnnnyyyynnnn...',
    '....nonnnnnnon....', '.....nnnnnnnn.....', '..................'] },
  penguin: { name: 'Penguin', grid: [
    '......kkkkkk......', '.....kkkkkkkk.....', '....kkwwkkwwkk....', '....kwkwkkwkwk....', '....kwwwwwwwwk....',
    '....kkwwoowwkk....', '...kkkrrrrrrkkk...', '..kkkwwwwwwwwkkk..', '.kk.kwwwwwwwwk.kk.', '.k..kwwwwwwwwk..k.',
    '....kwwwwwwwwk....', '....kwwwwwwwwk....', '....kkwwwwwwkk....', '.....kkwwwwkk.....', '......kkkkkk......',
    '.....oo....oo.....', '....ooo....ooo....', '..................'] },
  elephant: { name: 'Elephant', grid: [
    '..................', '..sss........sss..', '.sSSss.ssss.ssSSs.', 'sSSSSssssssssSSSSs', 'sSSSSssssssssSSSSs',
    'sSSSssksssskssSSSs', 'sSSSssssssssssSSSs', '.sSSssssssssssSSs.', '..ssssssSSssssss..', '....sssSssSsss....',
    '.....ssSssSss.....', '.....ssssssss.....', '......ssssss......', '......ssYYss......', '.......ssss.......',
    '.....ss.ss.ss.....', '....sss.ss.sss....', '..................'] },
  koala: { name: 'Koala', grid: [
    '..................', '.sss..........sss.', 'swwws........swwws', 'swwwsssssssssswwws', 'swwsssssssssssswws',
    '.swssssssssssssws.', '..ssssssssssssss..', '..ssksssssssskss..', '..ssssskkkksssss..', '..ssssskkkksssss..',
    '...sssskkkkssss...', '...ssssssssssss...', '....ssssssssss....', '.....ssssssss.....', '...gggggggggggg...',
    '..gGggggggggggGg..', '..................', '..................'] },
  sheep: { name: 'Sheep', grid: [
    '..................', '...wwwwwwwwwwww...', '..wwwwwwwwwwwwww..', '.wwwwwwwwwwwwwwww.', 'wwwkkkkkwwkkkkkwww',
    'wkkkkkkkkkkkkkkkkw', '..kkwkkkkkkkkwkk..', '..kkkkkkkkkkkkkk..', '..kkkkPkkkkPkkkk..', '..wkkkkkkkkkkkkw..',
    '.wwwkkkkwwkkkkwww.', '.wwwwwwwwwwwwwwww.', 'wwwwwwwwwwwwwwwwww', '.wwwwwwwwwwwwwwww.', '..ww..ww..ww..ww..',
    '..kk..kk..kk..kk..', '..................', '..................'] },
  giraffe: { name: 'Giraffe', grid: [
    '..........n..n....', '..........nnnn....', '.........yyyyyy...', '........yykyyyyy..', '.......yyyyyyyyyyn',
    '.........yyyyyynn.', '.........ynyy.....', '.........yyny.....', '........nyyyy.....', '........yynyy.....',
    '........yyyyn.....', '.......nyynyy.....', '..yyyyyyyyyyy.....', '.yynyyynyyyny.....', '.yyyynyyynyyy.....',
    '..y.y.....y.y.....', '..y.y.....y.y.....', '..n.n.....n.n.....'] },
  // ---------------- SWEETS ----------------
  lollipop: { name: 'Lollipop', grid: [
    '....pppp....', '..pppppppp..', '.ppwwwwwwpp.', '.pwwppppwwp.', 'ppwppwwppwpp',
    'ppwpwppwpwpp', 'ppwppwwppwpp', '.pwwppppwwp.', '.ppwwwwwwpp.', '..pppppppp..',
    '.....nn.....', '.....nn.....'] },
  icecream: { name: 'Ice Cream', grid: [
    '.....rr.....', '...pppppp...', '..ppPppppp..', '..pppppppp..', '.NNNNNNNNNN.',
    '..NnNnNnNn..', '..nNnNnNnN..', '...NnNnNn...', '...nNnNnN...', '....NnNn....',
    '.....nN.....', '......N.....'] },
  wrappedcandy: { name: 'Wrapped Candy', grid: [
    '............', '............', '............', 'y...pppp...y', 'yy.prpprp.yy',
    'yyypPrrPpyyy', 'yyyprpprpyyy', 'yy.pprrpp.yy', 'y...pppp...y', '............',
    '............', '............'] },
  cookie: { name: 'Cookie', grid: [
    '............', '...nnnnnn...', '.nnNNNNNNnn.', '.nNNNNNNNNn.', 'nNNkNNNNkNNn',
    'nNNNNNNNNNNn', 'nNkNNNNNNkNn', 'nNNNNkkNNNNn', '.nNNNNNNNNn.', '.nnNkNNkNnn.',
    '...nnnnnn...', '............'] },
  cakeslice: { name: 'Cake Slice', grid: [
    '............', '..........r.', '.......PPPP.', '....PPPPPPP.', '.PPPPPPPPPP.',
    '.NNNNNNNNNN.', '.NNNNNNNNNN.', '.pppppppppp.', '.NNNNNNNNNN.', '.NNNNNNNNNN.',
    'wwwwwwwwwwww', '............'] },
  macarons: { name: 'Macarons', grid: [
    '............', '..pppppppp..', '.pPppppppPp.', '.pppppppppp.', '.wwwwwwwwww.',
    '..pppppppp..', '............', '..bbbbbbbb..', '.bBbbbbbbBb.', '.wwwwwwwwww.',
    '.bbbbbbbbbb.', '..bbbbbbbb..'] },
  popsicle: { name: 'Popsicle', grid: [
    '..oooooooo..', '.oowoooowoo.', '.owoooooowo.', '.oooooooooo.', '.yyyyyyyyyy.',
    '.ywyyyyyywy.', '.yyyyyyyyyy.', '.pppppppppp.', '.pwppppppwp.', '..pppppppp..',
    '.....NN.....', '.....NN.....'] },
  chocolate: { name: 'Chocolate Bar', grid: [
    '............', '.kkkkkkkkkk.', '.kNnkNnkNnk.', '.knnknnknnk.', '.kkkkkkkkkk.',
    '.kNnkNnkNnk.', '.knnknnknnk.', '.rrrrrrrrrr.', '.rwwwwwwwwr.', '.rwyywwyywr.',
    '.rrrrrrrrrr.', '............'] },
  gummybear: { name: 'Gummy Bear', grid: [
    '............', '.gg......gg.', 'gGggggggggGg', '.gggggggggg.', '.gkggggggkg.',
    '..gggkkggg..', '.gggggggggg.', 'gggggggggggg', 'gGggggggggGg', '.gggggggggg.',
    '.gg.gggg.gg.', '............'] },
  candycane: { name: 'Candy Cane', grid: [
    '....rrww....', '...ww..rr...', '..rr....ww..', '..ww....rr..', '........ww..',
    '........rr..', '........ww..', '........rr..', '........ww..', '........rr..',
    '........ww..', '............'] },
  birthdaycake: { name: 'Birthday Cake', grid: [
    '..................', '....y....y....y...', '....o....o....o...', '....b....p....v...', '....b....p....v...',
    '..PPPPPPPPPPPPPP..', '..PpPPpPPPpPPpPP..', '..NNNNNNNNNNNNNN..', '..NNNNNNNNNNNNNN..', '..pppppppppppppp..',
    '..NNNNNNNNNNNNNN..', '..NNNNNNNNNNNNNN..', '..PPPPPPPPPPPPPP..', '.wwwwwwwwwwwwwwww.', '..wwwwwwwwwwwwww..',
    '..................', '..................', '..................'] },
  sundae: { name: 'Sundae', grid: [
    '........rr........', '.......rrrr.......', '.....pppppppp.....', '....pPppppppPp....', '...wwwwwwwwwwww...',
    '..wwwwwwwwwwwwww..', '.yyyyyyyyyyyyyyyy.', '.yyyyyyyyyyyyyyyy.', '..NNNNNNNNNNNNNN..', '...BBBBBBBBBBBB...',
    '....BBBBBBBBBB....', '.....BBBBBBBB.....', '......BBBBBB......', '.......BBBB.......', '........BB........',
    '......BBBBBB......', '....BBBBBBBBBB....', '..................'] },
  gingerbread: { name: 'Gingerbread', grid: [
    '..................', '......nnnnnn......', '.....nnnnnnnn.....', '.....nknnnnkn.....', '.....nnnnnnnn.....',
    '.....nnnwwnnn.....', '......nnnnnn......', '..nnnnnnnnnnnnnn..', '.nnwnnnnnnnnnnwnn.', '.nn..nnnrrnnn..nn.',
    '.....nnnnnnnn.....', '.....nnnrrnnn.....', '.....nnnnnnnn.....', '....nnnnnnnnnn....', '...nnnn....nnnn...',
    '..nwnn......nnwn..', '..nnn........nnn..', '..................'] },
  cottoncandy: { name: 'Cotton Candy', grid: [
    '..................', '.....PPPPPPPP.....', '...PPPPPPPPPPPP...', '..PPpPPPPPPPPpPP..', '.PPPPPPpPPpPPPPPP.',
    '.PpPPPPPPPPPPPPpP.', 'PPPPPPPPPPPPPPPPPP', 'PPPPpPPPPPPPPpPPPP', '.PPPPPPPPPPPPPPPP.', '..PPPPPPPPPPPPPP..',
    '...PPPPPPPPPPPP...', '.....PPPPPPPP.....', '.......bwwb.......', '.......wbbw.......', '........bb........',
    '........ww........', '........bb........', '..................'] },
  pie: { name: 'Cherry Pie', grid: [
    '..................', '..................', '..................', '.....NNNNNNNN.....', '...NNNNNNNNNNNN...',
    '..NrNNrNNNNrNNrN..', '.NNNNNNNNNNNNNNNN.', '.NrNNrNNrrNNrNNrN.', 'NNNNNNNNNNNNNNNNNN', 'NrNNrNNrNNrNNrNNrN',
    'nNNNNNNNNNNNNNNNNn', 'nnnnnnnnnnnnnnnnnn', '.nnnnnnnnnnnnnnnn.', '..wwwwwwwwwwwwww..', '..................',
    '..................', '..................', '..................'] },
  milkshake: { name: 'Milkshake', grid: [
    '........rr........', '.......rrrr.......', '.....wwwwwwww.....', '...wwwwwwwwwwww...', '..wwwwwwwwwwwwww..',
    '..PPPPPPPPPPPPPP..', '..PpPPPPPPPPPPpP..', '...PPPPPPPPPPPP...', '...PPPPPPPPPPPP...', '...PPpPPPPPPpPP...',
    '....PPPPPPPPPP....', '....PPPPPPPPPP....', '.....PPPPPPPP.....', '......PPPPPP......', '........BB........',
    '........BB........', '.....BBBBBBBB.....', '..................'] },
  // ---------------- OCEAN ----------------
  crab: { name: 'Crab', grid: [
    '.r........r.', 'rr........rr', 'r.r.wkkw.r.r', '.r..rrrr..r.', '..rrrrrrrr..',
    '.rrrrrrrrrr.', 'rrrRrrrrRrrr', 'rrrrrrrrrrrr', '.rrrrrrrrrr.', 'r.r.r..r.r.r',
    '.r.r....r.r.', '............'] },
  shell: { name: 'Seashell', grid: [
    '............', '............', '....PPPP....', '..PPpPPpPP..', '.PPpPPPPpPP.',
    '.PpPPppPPpP.', 'PPpPPppPPpPP', 'PpPPpPPpPPpP', 'PpPPpPPpPPpP', '.PPPPPPPPPP.',
    '...pppppp...', '..pppppppp..'] },
  whale: { name: 'Whale', grid: [
    '....B.B.....', '.....B......', '...bbbbb...b', '.bbbbbbbbbbb', 'bbkbbbbbbbb.',
    'bbbbbbbbbbb.', 'bBBBBBbbbb..', '.BBBBBBbbb..', '..bbbbbbb...', '............',
    '............', '............'] },
  octopus: { name: 'Octopus', grid: [
    '..vvvvvvvv..', '.vvvvvvvvvv.', 'vvvvvvvvvvvv', 'vvwkvvvvkwvv', 'vvvvvvvvvvvv',
    'vPvvvvvvvvPv', '.vvvvvvvvvv.', 'v.vv.vv.vv.v', 'v.v..vv..v.v', '.v.v.vv.v.v.',
    '.v..v..v..v.', '............'] },
  turtle: { name: 'Sea Turtle', grid: [
    '....gggg....', '....gkkg....', 'g.nnnnnnnn.g', 'ggnNnNNnNngg', '.nNnNnnNnNn.',
    '.nnNnNNnNnn.', '.nNnNnnNnNn.', '.nnnnnnnnnn.', 'gg.nnnnnn.gg', 'g..........g',
    '............', '............'] },
  jellyfish: { name: 'Jellyfish', grid: [
    '...pppppp...', '.pppppppppp.', 'pPppppppppPp', 'pppppppppppp', 'ppkppppppkpp',
    'pppppppppppp', '.p.pp..pp.p.', '.p.p.pp.p.p.', 'p..p.pp.p..p', 'p.p..pp..p.p',
    '.p.p....p.p.', '............'] },
  seahorse: { name: 'Seahorse', grid: [
    '.....oooo...', '....ookoo...', 'ooooooooo...', '....oooo....', '.....ooOo...',
    '....oooOO...', '....ooOoo...', '.....oooo...', '......ooo...', '....o..oo...',
    '....oooo....', '.....oo.....'] },
  dolphin: { name: 'Dolphin', grid: [
    '............', '......s.....', '.....ss.....', '...ssssss...', '.sssssssss..',
    'sskssssssss.', '.SSSSSssssss', '..SSSSSsss.s', '.......ss.ss', '........sss.',
    '............', '............'] },
  pufferfish: { name: 'Pufferfish', grid: [
    '..y..yy..y..', '.yyyyyyyyyy.', 'yyyyyyyyyyyy', 'ywkyyyyyykwy', 'yyyyyyyyyyyy',
    'oyyyyooyyyyo', 'yyyyyyyyyyyy', '.yyyyyyyyyy.', 'y.yyyyyyyy.y', '..y..yy..y..',
    '............', '............'] },
  clownfish: { name: 'Clownfish', grid: [
    '............', '............', '...oowoooo.o', '..ooowooowoo', '.okoowoooowo',
    'oooowoooowoo', '.ooowoooowoo', '..oowooow..o', '....oooo....', '............',
    '............', '............'] },
  shark: { name: 'Shark', grid: [
    '..................', '..................', '.........s........', '........ss........', '.......sss........',
    '....ssssssssss...s', '..sssssssssssss.ss', '.sksssssssssssssss', 'ssssssssssssssss.s', 'skwkwkwwwwwsss...s',
    '.wwwwwwwwwwss.....', '..wwwwwwwss.......', '....wwww..........', '..................', '..................',
    '..................', '..................', '..................'] },
  coralreef: { name: 'Coral Reef', grid: [
    '..................', '..................', '..................', '....p.....o.......', '...ppp...ooo..v...',
    '..p.p.p...o..vvv..', '..ppppp..ooo..v...', '...ppp...o.o.vvv..', '....p....ooo..v...', '..y.p..b..o..vv.r.',
    '.yyypbbb.ooo.v.rrr', '..ypbbb..o.o.v..r.', '...pbb..ooo...v.r.', '..yypb.oooo..vvrr.', '.yyyppbboooovvvrr.',
    '..................', '..................', '..................'] },
  sailboat: { name: 'Sailboat', grid: [
    '..................', '........k.........', '........kw........', '........kww.......', '.......rkwww......',
    '......rrkwwww.....', '.....rrrkwwwww....', '....rrrrkwwwwww...', '...rrrrrkwwwwwww..', '........k.........',
    '.nnnnnnnnnnnnnnnn.', '..nNNNNNNNNNNNNn..', '...nnnnnnnnnnnn...', 'bbbbbbbbbbbbbbbbbb', 'bBbbbBbbbBbbbBbbbB',
    '..................', '..................', '..................'] },
  treasure: { name: 'Treasure Chest', grid: [
    '..................', '..................', '....nnnnnnnnnn....', '...nNNNNNNNNNNn...', '..nNnnnnnnnnnnNn..',
    '..nyyyyyyyyyyyyn..', '..nNNNNNyyNNNNNn..', '..nNNNNyyyyNNNNn..', '..nyyyyyyyyyyyyn..', '..nNNNNNNNNNNNNn..',
    '..nNNNNNNNNNNNNn..', '..nnnnnnnnnnnnnn..', '.yy.y..........yy.', 'yyyyy.v.....r.yyyy', '..................',
    '..................', '..................', '..................'] },
  lighthouse: { name: 'Lighthouse', grid: [
    '........y.........', '.......yyy........', '......kkkkk.......', '......kwywk.......', '......kkkkk.......',
    '.......rwr........', '......rrrrr.......', '......wwwww.......', '.....rrrrrrr......', '.....wwwwwww......',
    '....rrrrrrrrr.....', '....wwwwwwwww.....', '...ssssssssss.....', '..sssssssssssss...', 'bbbbbbbbbbbbbbbbbb',
    'bBbbbBbbbBbbbBbbbB', '..................', '..................'] },
  submarine: { name: 'Submarine', grid: [
    '..................', '..................', '........yy........', '........yy........', '.....yyyyyyy......',
    '...yyyyyyyyyyy....', '..yybbyybbyybby..y', '..yybbyybbyybbyyyy', '...yyyyyyyyyyyy..y', '.....oooooo.......',
    '..................', '...b.......b......', '..bBb.....bBb.....', '..................', '..................',
    '..................', '..................', '..................'] },
  // ---------------- HALLOWEEN EVENT ----------------
  blackcat: { name: 'Black Cat', grid: [
    '.k........k.', '.kk......kk.', '.kkkkkkkkkk.', '.kkykkkkykk.', '.kkkkkkkkkk.',
    '..kkkppkkk..', '..kkkkkkkk..', '.kkkkkkkkkk.', 'kkkkkkkkkkkk', 'kkkkkkkkkkkk',
    '.kkkkkkkkkk.', '..kk.kk.kk..'] },
  spider: { name: 'Spider', grid: [
    '.....kk.....', '.....kk.....', 'k....kk....k', '.k.kkkkkk.k.', 'k.kkkkkkkk.k',
    'kkkrkkkkrkkk', 'k.kkkkkkkk.k', '.k.kkkkkk.k.', 'k...kkkk...k', '.k........k.',
    '............', '............'] },
  skull: { name: 'Skull', grid: [
    '..wwwwwwww..', '.wwwwwwwwww.', 'wwwwwwwwwwww', 'wkkkwwwwkkkw', 'wkkkwwwwkkkw',
    'wwwwwkkwwwww', '.wwwwwwwwww.', '..wwkwwkww..', '..wwwwwwww..', '............',
    '............', '............'] },
  jackolantern: { name: 'Jack-o\'-Lantern', grid: [
    '........gg........', '......g.nn.g......', '....oooooooooo....', '..oooonoooonoooo..', '.ooonnoooooonnooo.',
    'oooonoooooooonoooo', 'oooyynoooooonyyooo', 'ooyyynoooooonyyyoo', 'ooonooooyyoooonooo', 'ooynoooooooooonyoo',
    'oooyyyyyyyyyyyyooo', 'ooooyyoyyyyoyyoooo', 'ooonoooooooooonooo', '.oonoooooooooonoo.', '..oooooooooooooo..',
    '....oooooooooo....', '..................', '..................'] },
  hauntedhouse: { name: 'Haunted House', grid: [
    '........kk........', '.......kkkk.......', '......kkkkkk......', '.....kkkkkkkk.....', '....kkkkkkkkkk....',
    '...kkkkkkkkkkkk...', '....vvvvvvvvvv....', '....vyyvvvvyyv....', '....vyyvvvvyyv....', '....vvvvvvvvvv....',
    '....vvvvnnvvvv....', '....vvvvnnvvvv....', '....vvvvnnvvvv....', '.g.gggggggggggg.g.', 'gggGggggggggggGggg',
    '..................', '..................', '..................'] },
  cauldron: { name: 'Cauldron', grid: [
    '..................', '.....G......G.....', '......G.GG.G......', '....GGGGGGGGGG....', '...GGgGGGGGGgGG...',
    '..kkkkkkkkkkkkkk..', '.kkkkkkkkkkkkkkkk.', 'kkkkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkkkk',
    '.kkkkkkkkkkkkkkkk.', '..kkkkkkkkkkkkkk..', '...kk.kkkkkk.kk...', '..ooo.oooooo.ooo..', '.oyoooyooooyoooyo.',
    '..o.o..o..o..o.o..', '..................', '..................'] },
  moonbats: { name: 'Moon and Bats', grid: [
    '..................', '....yyyy..........', '..yyyyyy..........', '.yyyyyy...........', 'yyyyyy......v...v.',
    'yyyyy.......vv.vv.', 'yyyyy........vvv..', 'yyyyyy........v...', '.yyyyyy...........', '..yyyyyyyy........',
    '....yyyy..........', '......v.....v.....', '.....vvv...vvv....', '......v.....v.....', '..................',
    '..................', '..................', '..................'] },
};

window.PS_LEVELS = {
  flowers: {
    easy: ['flower', 'tulip', 'sunflower', 'daisy', 'cactusflower', 'violet'],
    medium: ['rose', 'lotus', 'lavender', 'pottedflower', 'poppy', 'sakura'],
    hard: ['bouquet', 'tulipbox', 'orchid', 'wreath', 'butterflyflower', 'dandelions'],
  },
  fruits: {
    easy: ['apple', 'cherry', 'banana', 'pear', 'strawberry', 'lemon'],
    medium: ['orangeslice', 'grapes', 'watermelon', 'pineapple', 'peach', 'kiwi'],
    hard: ['fruitbasket', 'avocado', 'appletree', 'blueberries', 'dragonfruit', 'coconutpalm'],
  },
  animals: {
    easy: ['cat', 'chick', 'puppy', 'bunny', 'frog', 'pig'],
    medium: ['fox', 'panda', 'owl', 'mouse', 'bear', 'cow'],
    hard: ['lion', 'penguin', 'elephant', 'koala', 'sheep', 'giraffe'],
  },
  sweets: {
    easy: ['cupcake', 'donut', 'lollipop', 'icecream', 'wrappedcandy', 'cookie'],
    medium: ['cakeslice', 'macarons', 'popsicle', 'chocolate', 'gummybear', 'candycane'],
    hard: ['birthdaycake', 'sundae', 'gingerbread', 'cottoncandy', 'pie', 'milkshake'],
  },
  ocean: {
    easy: ['fish', 'star', 'crab', 'shell', 'whale', 'octopus'],
    medium: ['turtle', 'jellyfish', 'seahorse', 'dolphin', 'pufferfish', 'clownfish'],
    hard: ['shark', 'coralreef', 'sailboat', 'treasure', 'lighthouse', 'submarine'],
  },
  halloween: ['pumpkin', 'ghost', 'bat', 'candy', 'hat', 'blackcat', 'spider', 'skull', 'jackolantern', 'hauntedhouse', 'cauldron', 'moonbats'],
};
