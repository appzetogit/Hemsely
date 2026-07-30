import React from 'react';
import demoPhoto from '../assets/6ee1ef9d2677e06049fb899a7658f4b9ac9c11dc.jpg';
import demoPhoto2 from '../assets/853e31e910922fe7f47f66de5c5206f78a610037.jpg';
import demoPhoto3 from '../assets/2d480a64955b32a3f343496aa510b7c06b62c97c.png';
import demoPhoto4 from '../assets/9bd108315ddebf58571ec9fe25c0a6d5d63096ba.png';
import demoPhoto5 from '../assets/a4e07912a9df7e2f14bba65dd13433a5d9fc0f9b.png';

export const PROFILES = [
    {
        id: 1,
        name: 'Anna Mcconaughey',
        age: 25,
        verified: true,
        isNew: true,
        job: 'Interior Designer at Company',
        photo: demoPhoto,
        photos: [demoPhoto, demoPhoto2, demoPhoto3],
        instagram: '@anrocks10',
        about: "Looking for someone to appreciate my puns and share pizza with. If you can't handle my cheesy jokes, you're not the one for me.",
        lookingFor: 'A long-term relationship',
        basics: { height: "5'8\"", religion: 'Hindu', drinks: 'Yes', smokes: 'No', education: 'Graduate' },
        interests: ['Photography', 'Travelling', 'Art & Crafts'],
        prompts: [
            { text: "I'll never forget the time I", answer: '12 PM' },
            { text: 'My favorite way to do nothing is', answer: 'Nothing' },
            { text: 'The last note I wrote on my phone says', answer: 'Bubble' },
        ],
        willMatch: false,
    },
    {
        id: 2,
        name: 'Priya Sharma',
        age: 23,
        verified: true,
        isNew: false,
        job: 'Software Engineer at Google',
        photo: demoPhoto4,
        photos: [demoPhoto4, demoPhoto5],
        instagram: '@priya.codes',
        about: 'Coffee addict, code lover, and weekend hiker. Looking for someone to debug life with me. 🚀',
        lookingFor: 'Something casual',
        basics: { height: "5'4\"", religion: 'Sikh', drinks: 'No', smokes: 'No', education: 'Post Graduate' },
        interests: ['Coding', 'Hiking', 'Music'],
        prompts: [
            { text: 'My ideal Sunday looks like', answer: 'Brunch & Netflix' },
            { text: 'The key to my heart is', answer: 'Good food' },
        ],
        willMatch: true,
    },
    {
        id: 3,
        name: 'Meera Patel',
        age: 27,
        verified: false,
        isNew: true,
        job: 'Architect at Foster+Partners',
        photo: demoPhoto5,
        photos: [demoPhoto5, demoPhoto],
        instagram: '@meera.builds',
        about: "I design buildings by day and binge Netflix by night. Let's build something beautiful together 🏗️",
        lookingFor: 'A long-term relationship',
        basics: { height: "5'6\"", religion: 'Hindu', drinks: 'Yes', smokes: 'No', education: 'Graduate' },
        interests: ['Architecture', 'Travel', 'Yoga'],
        prompts: [
            { text: 'A life goal of mine is', answer: 'Build my own house' },
            { text: "I'm weirdly attracted to", answer: 'Good handwriting' },
        ],
        willMatch: false,
    },
    {
        id: 4,
        name: 'Riya Kapoor',
        age: 24,
        verified: true,
        isNew: false,
        job: 'Marketing Manager at Zomato',
        photo: demoPhoto2,
        photos: [demoPhoto2, demoPhoto3],
        instagram: '@riyakapooor',
        about: 'Foodie at heart 🍕 Dog mom 🐶 Always up for spontaneous road trips.',
        lookingFor: 'New friends',
        basics: { height: "5'5\"", religion: 'Christian', drinks: 'Yes', smokes: 'No', education: 'Graduate' },
        interests: ['Food', 'Dogs', 'Road Trips'],
        prompts: [
            { text: 'The way to my heart is', answer: 'Biryani' },
            { text: 'Together we could', answer: 'Road trip!' },
        ],
        willMatch: false,
    },
    {
        id: 5,
        name: 'Ananya Singh',
        age: 22,
        verified: true,
        isNew: true,
        job: 'Fashion Designer at H&M',
        photo: demoPhoto3,
        photos: [demoPhoto3, demoPhoto4],
        instagram: '@ananya.styles',
        about: 'Creating outfits that make heads turn 👗 Love music festivals and brunch dates.',
        lookingFor: 'A long-term relationship',
        basics: { height: "5'7\"", religion: 'Hindu', drinks: 'Occasionally', smokes: 'No', education: 'Graduate' },
        interests: ['Fashion', 'Music', 'Brunches'],
        prompts: [
            { text: 'My most controversial opinion is', answer: 'Pineapple on pizza' },
            { text: 'I geek out on', answer: 'Fabric textures' },
        ],
        willMatch: false,
    },
];

export const getStored = (k, d) => { try { const v = localStorage.getItem(k + ':v1') || localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
export const setStored = (k, v) => localStorage.setItem(k + ':v1', JSON.stringify(v));

export const renderInterestIcon = (type) => {
    const iconAttrs = { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
    switch (type) {
        case 'Photography':
            return React.createElement('svg', iconAttrs,
                React.createElement('path', { d: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" }),
                React.createElement('circle', { cx: "12", cy: "13", r: "4" })
            );
        case 'Travelling':
            return React.createElement('svg', iconAttrs,
                React.createElement('path', { d: "M8 3l4 8l5-5l5 15H2z" })
            );
        case 'Art & Crafts':
            return React.createElement('svg', iconAttrs,
                React.createElement('circle', { cx: "13.5", cy: "6.5", r: ".5" }),
                React.createElement('circle', { cx: "17.5", cy: "10.5", r: ".5" }),
                React.createElement('circle', { cx: "8.5", cy: "7.5", r: ".5" }),
                React.createElement('circle', { cx: "6.5", cy: "12.5", r: ".5" }),
                React.createElement('path', { d: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" })
            );
        default:
            return React.createElement('svg', iconAttrs,
                React.createElement('circle', { cx: "12", cy: "12", r: "10" }),
                React.createElement('path', { d: "M8 14s1.5 2 4 2 4-2 4-2" }),
                React.createElement('line', { x1: "9", y1: "9", x2: "9.01", y2: "9" }),
                React.createElement('line', { x1: "15", y1: "9", x2: "15.01", y2: "9" })
            );
    }
};

export const Pill = ({ icon, children }) => (
    React.createElement('div', { className: "flex items-center gap-2 px-3.5 py-1.5 bg-[#F5F3FF] border border-purple-100/80 rounded-full text-gray-900 text-[13.5px] font-semibold shadow-2xs" },
        icon ? React.createElement('span', { className: "flex items-center shrink-0" }, icon) : null,
        React.createElement('span', null, children)
    )
);
