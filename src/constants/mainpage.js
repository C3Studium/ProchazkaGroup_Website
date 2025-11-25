export const StatbarData = [
       {
        value: '12',
        barkingPoint: '7',
        name: 'Let na trhu'
    },
    {
        value: '3000+',
        barkingPoint: '2500',
        name: 'Spokojených klientů'
    },
    {
        value: '9000+',
        barkingPoint: '8000',
        name: 'Podepsaných smluv'
    },
    {
        value: '43',
        barkingPoint: '36',
        name: 'Partnerskchých Společností'
    }
]


export const deals = [
    {
        number: '01',
        contentD: 'Ušetříme Vám min. 500,- hned po první schůzce,',
        contentG: 'A když ne, dáme 500,- Vám ve slevách, nebo v hotovosti',
        src: '/assets/mainBackground.webp',
        alt: 'deal'
    },
    {
        number: '02',
        contentD: 'Hned druhý den začneme, do 5 dnů vyřešíme a zavoláme',
        contentG: 'Zpoždění? dáme vám naši limitovanou slevu k tomu',
        src: '/assets/mainBackground.webp',
    },
    {
        number: '03',
        contentD: 'Nevyžadujeme žádné skryté smlouvy',
        contentG: 'Ale jsme upřímní s naši pomocí, takže choďte na čas.',
        src: '/assets/mainBackground.webp',

    }
]


export const offerStats = [
    {
        value: '3000+',
        name: 'spokoných klientů',
        breakingPoint: '2500'
    },
    {
        value: '9 500,-',
        name: ' ušetřených korun / klienta',
        breakingPoint: '9000'
    }
]

export const dataR = [
    {
        rate: '8',
        rateText: 'z deseti',
        text: 'Domácností jsou v dluzích nebo je ignorují'
    },
    {
        rate: '3',
        rateText: 'z deseti',
        text: 'Domácností zachraňuje Budgeting a správné praktiky před dluhy'
    },
    {
        rate: '1',
        rateText: 'z deseti',
        text: 'Domácností má profesionála, který skutečně léčí jejich finance'
    }
]

// export const chartData1 = [
//   { date: "2025", "Inflace": 100, "Běžná cesta": 100 },
//   { date: "2026", "Inflace": 103, "Běžná cesta": 101.5 },
//   { date: "2027", "Inflace": 106.09, "Běžná cesta": 103.0225 },
//   { date: "2028", "Inflace": 109.27, "Běžná cesta": 104.5678 },
//   { date: "2029", "Inflace": 112.55, "Běžná cesta": 106.1363 },
//   { date: "2030", "Inflace": 115.93, "Běžná cesta": 107.7283 },
//   { date: "2040", "Inflace": 155.80, "Běžná cesta": 124.677 },
//   { date: "2050", "Inflace": 209.38, "Běžná cesta": 144.367 },
//   { date: "2060", "Inflace": 281.02, "Běžná cesta": 167.170 }
// ];

// export const chartData2 = [
//   { date: "2025", "Inflace": 100, "Naše cesta": 100 },
//   { date: "2026", "Inflace": 103, "Naše cesta": 115 },
//   { date: "2027", "Inflace": 106.09, "Naše cesta": 132.25 },
//   { date: "2028", "Inflace": 109.27, "Naše cesta": 152.09 },
//   { date: "2029", "Inflace": 112.55, "Naše cesta": 174.90 },
//   { date: "2030", "Inflace": 115.93, "Naše cesta": 201.13 },
//   { date: "2040", "Inflace": 155.80, "Naše cesta": 813.71 },
//   { date: "2050", "Inflace": 209.38, "Naše cesta": 3293.69 },
//   { date: "2060", "Inflace": 281.02, "Naše cesta": 13328.77 }
// ];

function compound(start, rate, years) {
    return +(start * Math.pow(1 + rate, years)).toFixed(2);
}

// 10 years, 2-year intervals: 2025, 2027, 2029, 2031, 2033, 2035, 2037, 2039, 2041, 2043, 2045
const years = [];
for (let y = 2025; y <= 2045; y += 2) years.push(y);

// Běžná cesta: +1.5%/year, Inflace: -3%/year, so net -1.5%/year
export const chartData1 = years.map(year => {
    const diff = year - 2025;
    return {
        date: String(year),
        "Vaše peníze": 100,
        "Běžná cesta": compound(100, -0.015, diff),
        "Inflace": compound(100, -0.03, diff)
    };
});

// Naše cesta: +15%/year, Inflace: -3%/year, so net +12%/year
export const chartData2 = years.map(year => {
    const diff = year - 2025;
    return {
        date: String(year),
        "Vaše peníze": 100,
        "Naše cesta": compound(100, 0.12, diff),
        "Inflace": compound(100, -0.03, diff)
    };
});

export const cardsRequirements = [
    {
        number: '6 let',
        content: 'Dlouholeté spolupráce vyžadují naše nejlepší vysledky s klienty',
        src: "/assets/mainBackground.webp",

    },
    {
        number: '100%',
        content: 'Dochvilnost a připravenost zkrátí schůzky až na polovinu',
        src: "/assets/mainBackground.webp",
    },
    {
        number: '3 měsíce',
        content: 'Trvá než se člověk naučí správně používat svůj měsíční rozpočet',
        src: "/assets/mainBackground.webp",
    }
]

export const testimonials = [
    {
        id: 1,
        number: '01',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 2,
        number: '02',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 3,
        number: '03',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 4,
        number: '04',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 5,
        number: '05',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 6,
        number: '06',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 7,
        number: '07',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 8,
        number: '08',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 9,
        number: '09',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 10,
        number: '10',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    }
]


export const valuesTheWay = [
    {
        number: '01',
        text: 'Za to, že se v životě nepohnete z místa'
    },
    {
        number: "02",
        text: "Za to, že platíte každý rok daně téměř za vše"
    },
    {
        number: "03",
        text: "Za to, že máte skvělé zdraví, volný čas a vztahy"
    }
]

export const chartDataTheWay = [
    {
      date: "2020",
      "Běžná cesta": 20000,
      "Naše cesta": 45000,
    },
    {
      date: "2025",
      "Běžná cesta": 35000,
      "Naše cesta": 85000,
    },
    {
      date: "2030",
      "Běžná cesta": 45000,
      "Naše cesta": 125000,
    },
    {
      date: "2035", 
      "Běžná cesta": 55000,
      "Naše cesta": 165000,
    }
]


export const partnersIcons = [
    {
        src: '/logos/Allianz.webp',
        alt: 'Allianz'
    },
    {
        src: '/logos/Amundi.webp',
        alt: 'Amundi'
    },
    {
        src: '/logos/arts.webp',
        alt: 'Arts'
    },
    {
        src: '/logos/AXA.webp',
        alt: 'AXA'
    },
    {
        src: '/logos/ceskapojis.webp',
        alt: 'Ceska Pojisovna'
    },
    {
        src: '/logos/Conseq.webp',
        alt: 'Conseq'
    },
    {
        src: '/logos/cp_invest.webp',
        alt: 'CP Invest'
    },
    {
        src: '/logos/cpp.webp',
        alt: 'CPP'
    },
    {
        src: '/logos/csob.webp',
        alt: 'CSOB'
    },
    {
        src: '/logos/csobpenzpoj.webp',
        alt: 'CSOB Penzpoj'
    },
    {
        src: '/logos/csobstavebnisporitelna.webp',
        alt: 'CSOB Stavebni Sporitelna',
    },
    {
        src: '/logos/das.webp',
        alt: 'DAS'
    },
    {
        src: '/logos/gcp.webp',
        alt: 'GPC'
    },
    {
        src: '/logos/gpenzspor.webp',
        alt: 'GPenzSpor'
    },
    {
        src: '/logos/hypotecnibanka.webp',
        alt: 'Hypotecni Banka'
    },
    {
        src: '/logos/ING.webp',
        alt: 'ING'
    },
    {
        src: '/logos/KB.webp',
        alt: 'KB'
    },
    {
        src: '/logos/kbpenzijni.webp',
        alt: 'KB Penzijni'
    },
    {
        src: '/logos/Komercnipojistovna.webp',
        alt: 'Komercni Pojistovna'
    },
    {
        src: '/logos/kooperativa.webp',
        alt: 'Kooperativa'
    },
    {
        src: '/logos/Mbank.webp',
        alt: 'Mbank'
    },
    {
        src: '/logos/metlife.webp',
        alt: 'Metlife'
    },
    {
        src: '/logos/modrapyr.webp',
        alt: 'Modra Pyramida'
    },
    {
        src: '/logos/monetamb.webp',
        alt: 'Moneta MB'
    },
    {
        src: '/logos/monetastavbspor.webp',
        alt: 'Moneta Stavebni Sporitelna'
    },
    {
        src: '/logos/penzceskapoj.webp',
        alt: 'Penz Ceska Poj'
    },
    {
        src: '/logos/penzijniceskaspor.webp',
        alt: 'Penzijni Ceska Sporitelna'
    },
    {
        src: '/logos/reifbank.webp',
        alt: 'Reif Bank'
    },
    {
        src: '/logos/reifstavbspor.webp',
        alt: 'Reif Stavebni Sporitelna'
    },
    {
        src: '/logos/stavebni_sporitelna_cs.webp',
        alt: 'Stavebni Sporitelna Ceska'
    },
    {
        src: '/logos/unicreditbank.webp',
        alt: 'Unicredit Bank'
    },
    {
        src: '/logos/uniqua.webp', 
        alt: 'Uniqua'
    },
    {
        src: '/logos/youplus.webp',
        alt: 'You Plus'
    }
]

export const BenefitCards = [
    {
        number: '01',
        header: 'Budete mít více času a klid díky plánování',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
        icon: '/icons/stopwatch.webp'
    },
    {
        number: '02',
        header: 'Kontrolujeme vaši situaci pravidelně',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
        icon: '/icons/monitor.webp'
    },
    {
        number: '03',
        header: 'Jsme vázáni zákonem a ČNB',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
        icon: '/icons/medal.webp'
    }
]

export const MainTestimonials = [
    {
        id: 1,
        number: '01',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 2,
        number: '02',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 3,
        number: '03',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 4,
        number: '04',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 5,
        number: '05',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 6,
        number: '06',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 7,
        number: '07',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 8,
        number: '08',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 9,
        number: '09',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    },
    {
        id: 10,
        number: '10',
        hashtag: '#hashtag',
        name: 'John Doe',
        town: 'Strakonice',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien.',
    }
]