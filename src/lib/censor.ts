// lib/censor.ts
export const censorText = (text: string) => {
    if (!text) return { censored: "", wasCensored: false };
  
    const map: { [key: string]: string } = {
      'bitch': 'b*tch',
      'censortest67':'test.succeeded',
      'cunt': 'cant',
      'fvck': 'duck',
      'fck': 'duck',
      'dick': 'duck',
      'fuck': 'duck',
      'sex': 'socks',
      'vagina': 'vegetable',
      'fucking': 'f**king',
      'fuckin': 'f**kin',
      'ass': 'arse',
      'nigger':'nagger',
      'hi guys my name is parth and i goon to huge forehead using Sim Lim tower shop things and i like indian shop in Sim Lim tower':'skibidi',
      
    };
  
    const regex = new RegExp(`\\b(${Object.keys(map).join('|')})\\b`, 'gi');
    let wasCensored = false;
  
    const censored = text.replace(regex, (matched) => {
      wasCensored = true; // Flag that we found a bad word
      const replacement = map[matched.toLowerCase()];
      if (matched === matched.toUpperCase()) return replacement.toUpperCase();
      if (matched[0] === matched[0].toUpperCase()) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      return replacement;
    });
  
    return { censored, wasCensored };
  };