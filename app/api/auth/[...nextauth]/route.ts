import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import { FirestoreAdapter } from "@auth/firebase-adapter"
import { initializeApp } from "firebase/app"

const firebaseConfig = {
  // Your Firebase configuration
}

const app = initializeApp(firebaseConfig)

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_ID,
      clientSecret: process.env.FACEBOOK_SECRET,
    }),
  ],
  adapter: FirestoreAdapter(app),
})

export { handler as GET, handler as POST }

