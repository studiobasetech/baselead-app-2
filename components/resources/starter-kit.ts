/* Ready-to-edit starting content for a new Sales Toolkit. Brackets are placeholders. */
export const STARTER_KIT: {
  name: string;
  emoji: string;
  description: string;
  is_course?: boolean;
  items: { title: string; description: string; body: string; tags: string[] }[];
}[] = [
  {
    name: "Sales Pitch",
    emoji: "🎤",
    description: "How we introduce ourselves and our offer.",
    items: [
      {
        title: "30-second elevator pitch (template)",
        description: "Edit with your own offer and results.",
        tags: ["pitch", "template"],
        body: `We help [type of business] in [city/industry] [main result] without [main pain].

Most [ideal clients] we talk to struggle with [problem 1] and [problem 2]. We fix that with [your product/service], so they [measurable outcome] in [timeframe].

For example, [client] went from [before] to [after].

Would it make sense to look at whether we could do the same for you?`,
      },
      {
        title: "Discovery call script (template)",
        description: "Questions to qualify a lead in 15–20 minutes.",
        tags: ["call", "script", "template"],
        body: `1. OPENING (1 min)
"Thanks for your time, [name]. The goal today is to understand how you handle [area] and see if we can help. Sound good?"

2. SITUATION
- How are you handling [area] today?
- Who is involved in that?

3. PROBLEM
- What's not working as well as you'd like?
- What does that cost you each month (time, money, clients)?

4. IMPACT & PRIORITY
- If nothing changes in 6 months, what happens?
- How important is solving this right now (1–10)?

5. DECISION
- Who else is involved in a decision like this?
- What budget range are you working with?
- What's your timeline?

6. NEXT STEP
"Based on what you shared, the next step is [demo/proposal]. Does [day/time] work?"`,
      },
    ],
  },
  {
    name: "Objection Handling",
    emoji: "🛡️",
    description: "Proven answers to the most common objections.",
    items: [
      {
        title: "Top objections & answers (template)",
        description: "Add the real objections your team hears.",
        tags: ["objections", "template"],
        body: `"IT'S TOO EXPENSIVE"
→ "I understand. Compared to what? … If we [result], how much would that be worth to you each month?"

"SEND ME MORE INFORMATION"
→ "Of course. So I send the right thing — what specifically would you like to see? And when should we review it together?"

"WE ALREADY HAVE SOMEONE"
→ "Great, that means it's a priority. What would you improve about your current solution if you could?"

"I NEED TO THINK ABOUT IT"
→ "Totally fair. What part would you like to think through? Usually it's price, timing or fit — which one is it for you?"

"NOT RIGHT NOW"
→ "Understood. When would be a better time, and what needs to happen before then? I'll follow up on [date]."`,
      },
    ],
  },
  {
    name: "Sales Training Course",
    emoji: "🎓",
    description: "Step-by-step training. Each person's progress is tracked.",
    is_course: true,
    items: [],
  },
  { name: "Case Studies & Proof", emoji: "🏆", description: "Results, testimonials and success stories to share with leads.", items: [] },
  { name: "Pricing & Proposals", emoji: "💰", description: "Price lists, packages and proposal examples.", items: [] },
  {
    name: "Email & Message Templates",
    emoji: "✉️",
    description: "Copy-paste messages for every stage.",
    items: [
      {
        title: "Cold email (template)",
        description: "Short first-touch email.",
        tags: ["email", "template"],
        body: `Subject: Quick idea for {{company}}

Hi {{first_name}},

I noticed [something specific about their business]. We help [similar businesses] [result] — for example [short proof].

Would you be open to a 15-minute call to see if it's a fit? Here's my calendar: {{booking_link}}

Best,
[Your name]`,
      },
    ],
  },
];
