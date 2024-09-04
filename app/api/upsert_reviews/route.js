import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

export async function POST(req){
    try{
        const { professor, subject, review, stars } = await req.json();

   
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    const index = pc.index('rag').namespace('ns1');
    const openai = new OpenAI();

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: review, 
    });
    const embedding = embeddingResponse.data[0].embedding;

    
    await index.upsert([{
      id: professor.toLowerCase().replace(/\s/g, '-') + '-' + subject.toLowerCase().replace(/\s/g, '-'),  // Unique ID for each professor + subject
      values: embedding,
      metadata: {
        professor,   
        subject,      
        stars,        
        review,       
      },
    }]);

    return new NextResponse("Review Submitted");
    }
    catch(error){
        console.error(error);
        return new NextResponse("Failed Submission", { status: 500 });
    }
}