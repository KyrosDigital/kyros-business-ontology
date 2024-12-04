# Kyros Business Ontology

Local development:

`yarn dev`
or
`yarn clean-dev` to reset the database and start fresh

`yarn local` to run the local tunnel for testing
update clerk webhook in dashboard to point to the local tunnel endpoint

`yarn stripe-local` to run the local stripe webhook for testing

`yarn prisma-studio` to open the prisma studio for viewing the database

Prior to developing, delete pinecone indexes, delete all users and organizations in clerk. 

