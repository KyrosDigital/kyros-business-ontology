import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { extractTextFromPdf } from '../../../../lib/pdf_parse'

export async function POST(request: Request) {
	console.log('Processing attachment')
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return new NextResponse('No file provided', { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return new NextResponse('Invalid file type. Only PDFs are allowed', { 
        status: 400 
      })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

		console.log(buffer)
    
    const text = await extractTextFromPdf(buffer)

    return NextResponse.json({ 
      success: true, 
      text,
      filename: file.name
    })

  } catch (error) {
    console.error('Error processing PDF:', error)
    return new NextResponse('Error processing PDF', { status: 500 })
  }
}
