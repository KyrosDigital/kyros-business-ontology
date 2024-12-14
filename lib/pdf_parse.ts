import pdfParse from 'pdf-parse'

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // Parse the PDF
    const data = await pdfParse(buffer)
    
    // data.text contains all the text content
    console.log('Extracted PDF text:', data.text)
    return data.text

  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    throw error
  }
}
