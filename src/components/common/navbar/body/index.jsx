import { motion } from 'framer-motion'

import { NavLinks, NavAddLinks, NavIcons } from '@/constants/common'


const rows = [
    {
        number: 0,
    },
    {
        number: 1,
    },
    {
        number: 2,
    }
]

const textShow = {
    initial: {
        opacity: 0,
        y: '100%'
    },
    enter: (i) => ({
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            ease: [0.76, 0, 0.24, 1],
            delay: (i * 0.05) + 0.6
        }
    }),
    exit: (i) => ({
        opacity: 0,
        y: '100%',
        transition: {
            duration: 0.5,
            ease: [0.76, 0, 0.24, 1],
            delay: ((NavLinks.length - i - 1) * 0.05)
        }
    })
};


const logoShow = {
    initial: {
        opacity: 0,
        y: '-100%'
    },
    enter: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.76, 0, 0.24, 1], delay: 0.7 }
    },
    exit: {
        opacity: 0,
        y: '-100%',
        transition: { duration: 0.5, ease: [0.76, 0, 0.24, 1], delay: 0.1 }
    }
}

const background = {
    initial: {
        x: '100%'
    },
    enter: {
        x: '0%',
        transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] }
    },
    exit: {
        x: '100%',
        transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1], delay: 0.6 }
    }
}
const rowSlide = {
    initial: {
        x: '100%',
    },
    enter: (i) => ({
        x: '0%',
        transition: {
            duration: 0.7,
            ease: [0.76, 0, 0.24, 1],
            delay: ((rows.length - i - 1) * 0.1) + 0.2
        },
    }),
    exit: (i) => ({
        x: '100%',
        transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1], delay: (i * 0.15) + 0.3 },
    }),
};


const titles = [
    {
        title: "Link",
        index: 0
    },
    {
        title: "popis",
        index: 1
    },
    {
        title: "foto",
        index: 2
    }
]

// const NavLinks = [
//     {
//         title: "HLAVNÍ STRÁNKA",
//         decs: "",
//         href: "/",
//         index: 0
//     },
//     {
//         title: "BENEFIT PROGRAM",
//         decs: "",
//         href: "/benefit-program",
//         index: 1
//     },
//     {
//         title: "O NÁS",
//         decs: "",
//         href: "/o-nas",
//         index: 2
//     },
//     {
//         title: "PORACI",
//         decs: "",
//         href: "/o-nas#poraci",
//         index: 0
//     },
//     {
//         title: "PARTNEŘI",
//         decs: "",
//         href: "/nabidky",
//         index: 1
//     },
//     {
//         title: "RECENZE",
//         decs: "",
//         href: "/recenze",
//         index: 0
//     },
//     {
//         title: "KONTAKT",
//         decs: "",
//         href: "/kontakt",
//         index: 1
//     },
// ]


export default function NavbarBody({ setMenu }) {


    // return (
    //     <section>
    //         <div className="divider" />
    //         <div className="divider" />
    //         <div className="navbar__body__container">
    //             {
    //                 titles.map((title, index) => (
    //                     <div key={index} className="navbar__body__link">
    //                         <p>{title.title}</p>
    //                     </div>
    //                 ))
    //             }
    //         </div>
    //         <div>
    //             <div>

    //             </div>
    //             <div>

    //             </div>
    //             <div>

    //             </div>
    //         </div>
    //     </section>
    // );
}