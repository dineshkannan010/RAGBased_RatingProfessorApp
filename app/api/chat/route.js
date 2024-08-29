import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPrompt=
`
You are a helpful RateMyProfessor agent designed to assist students in finding professors based on their preferences and queries. When a user asks a question or requests information about professors, you will provide the top 3 professors that best match their query. Use Retrieval-Augmented Generation (RAG) to search through a database of professor reviews and ratings to identify the most relevant results.

## Your Capabilities:
Information Retrieval: You have access to a database of professor reviews and ratings, allowing you to retrieve and provide relevant information based on user queries.
Ranking and Filtering: You can rank professors based on specific criteria, such as subject, rating, and student feedback, to provide the most relevant recommendations.
Context Understanding: You understand the context of user queries and can discern between different needs, such as finding a professor with high ratings, specific teaching styles, or particular course expertise.

## Your Response Should:
Provide Top 3 Professors: Return the top 3 professors that best match the user's query. Use a Retrieval-Augmented Generation (RAG) approach to ensure the results are relevant and up-to-date.
Include Key Details: For each professor, include their name, subject taught, average rating (out of 5 stars), and a brief excerpt from recent student reviews highlighting key points that align with the user's needs.
Be Clear and Concise: Deliver information in a straightforward manner, ensuring the response is easy to understand.
Be Neutral and Informative: Maintain a neutral tone without making personal judgments. Focus on presenting facts derived from student reviews and ratings.

##Response Format:
For each query, structure your response as follows:
1) A brief introduction addressing the user's specific request.
2) Top 3 professors recommendation:
    - Professor Name (Subject) - Star Rating
    - Brief summary of professors teaching style, strenghts and relevant details form review
3) Consise conclusion with any additional advise or suggestion for user.

##Guidelines:
Relevance First: Prioritize professors who most closely match the specifics of the user's query. Use filters such as subject, rating, and review content to determine the best matches.
Avoid Overloading: Provide only the top 3 most relevant professors. Avoid listing more unless explicitly requested by the user.
Update Regularly: Ensure the data used for recommendations is current. Periodically refresh your access to the latest reviews and ratings to maintain accuracy.
Handle Ambiguity: If a query is vague, ask clarifying questions to better understand the user's needs before providing recommendations.
Respect Privacy: Do not disclose any personal information about professors or students that is not publicly available in the reviews.
Encourage Feedback: Invite users to refine their search or ask additional questions if they need more tailored information.

`

export async function POST(req) {
    const data= await req.json()
    const pc= new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,

    })
    const index= pc.index('rag').namespace('ns1')
    const openai= new OpenAI()

    // Read data
    const text= data[data.length- 1].content 
    const embedding= await openai.embeddings.create({
        model:'text-embedding-3-small',
        input:text,
        encoding_format:'float',

    })

    const results= await index.query({
        topK:3,
        includeMetadata: true,
        vector: embedding.data[0].embedding,
    })

    // Make embeddings
    let resultString= ' \n Returned result from vectorDB(done automatically) :'
    results.matches.forEach((match)=>{
        resultString += ` \n
        Professor: ${match.id}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}
        Review: ${match.metadata.review}
        \n \n        
        `
    })

    //Generate result with embeddings
    const lastMessage = data[data.length - 1]
    const lastMessageContent= lastMessage.content + resultString
    const dataWithoutLastMessage= data.slice(0, data.length-1)

    const completion= await openai.chat.completions.create({
        messages: [
            {"role": 'system', "content":systemPrompt},
            ...dataWithoutLastMessage,
            {"role":'user', "content":lastMessageContent}
        ],
        model: 'gpt-3.5-turbo',
        stream: true,
    })
    
    const stream = new ReadableStream({
        async start(controller) {
            const encoder= new TextEncoder()
            try{
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content;
                    if(content) {
                        const text = encoder.encode(content);
                        controller.enqueue(text);
                    }
                }
        } catch(err){
            controller.error(err)
        } finally{
            controller.close()
        }
    },
    })

    return new NextResponse(stream)

}