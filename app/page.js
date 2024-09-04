'use client'
import { useState, useEffect, useRef } from "react";
import { Box, Stack, TextField, Button, Typography, ThemeProvider, createTheme } from "@mui/material";

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
  },
});

export default function Home() {
  const [messages, setMessages]= useState([
    {
      role: "assistant",
      content:"Hi! I am Rate my Professor support chat system. How can I help you today?"
    }
  ])
  const [message, setMessage]= useState('')

  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Added fields for uploading review
const [reviewData, setReviewData] = useState({
  professor: '',
  subject: '',
  review: '',
  stars: ''
});

const handleInputChange = (e) => {
  setReviewData({ ...reviewData, [e.target.name]: e.target.value });
};
const submitReview = async () => {
  const response = await fetch('/api/upsert_reviews', {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(reviewData),
  });

  if (response.ok) {
    console.log('Review successfully submitted!');
    // Optionally reset the form after submission
    setReviewData({ professor: '', subject: '', review: '', stars: '' });
  } else {
    console.error('Failed to submit the review.');
  }
};

  const sendMessage= async()=>{
    setMessages((messages)=>[
      ...messages, 
      {role: 'user', content: message},
      { role:'assistant', content: ' ' },
    ])
    setMessage('')
    const response= fetch('api/chat', {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json',
      },
      body: JSON.stringify([...messages, {role:'user', content: message}])
    }).then(async (res)=> {
      const reader= res.body.getReader()
      const decoder= new TextDecoder()
      let result= ''
      return reader.read().then( function processText({done, value}){
        if (done) {
          return result
        }
        const text= decoder.decode(value || new Uint8Array(), {stream: true})
        console.log(text)
        setMessages((messages) => {
          let lastMessage= messages[messages.length-1]
          let otherMessages= messages.slice(0, messages.length-1)

          return [
            ...otherMessages, 
            {...lastMessage, content: lastMessage.content + text},
          ]
        })
        return reader.read().then(processText)
      })
    })
  }

    return (
    <ThemeProvider theme={darkTheme}>
      <Box
        width="100vw"
        height="100vh"
        display="flex"
        flexDirection="row"
        justifyContent="space-evenly"
        alignItems="center"
        bgcolor="background.default"
        color="text.primary"
      >
        {/* Section to Submit New Review*/}
        <Box marginRight={"10px"} >
          <Typography justifyContent="center"
          alignItems="center" 
          sx={{fontSize:"20px"}}> Submit Review for Professor</Typography>
            <Stack spacing={3}>
              <TextField
                label="Professor Name"
                name="professor"
                value={reviewData.professor}
                onChange={handleInputChange}
              />
              <TextField
                label="Subject"
                name="subject"
                value={reviewData.subject}
                onChange={handleInputChange}
              />
              <TextField
                label="Review"
                name="review"
                value={reviewData.review}
                onChange={handleInputChange}
                multiline
              />
              <TextField
                label="Stars"
                name="stars"
                type="number"
                value={reviewData.stars}
                onChange={handleInputChange}
              />
              <Button variant="contained" onClick={submitReview}>
                Submit Review
              </Button>
            </Stack>
          </Box>
        <Box >
          <Typography justifyContent="center"
        alignItems="center" 
        sx={{fontSize:"20px"}}> Chat System</Typography>
        <Stack
          direction="column"
          maxWidth="800px"
          maxHeight="600px"
          width={{ xs: '90vw', sm: '80vw', md: '70vw', lg: '60vw', xl: '50vw' }}  // Responsive width settings
          height={{ xs: '80vh', sm: '70vh', md: '60vh', lg: '60vh', xl: '60vh' }}  // Responsive height settings
          bgcolor="background.paper"
          borderRadius={2}
          p={2}
          spacing={3}
          boxShadow={3}
        > 
          <Stack
            direction="column"
            spacing={2}
            flexGrow={1}
            overflow="auto"
            maxHeight="100%"
          >
            {messages.map((message, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent={
                  message.role === 'assistant' ? 'flex-start' : 'flex-end'
                }
              >
                <Box
                  bgcolor={
                    message.role === 'assistant' ? 'primary.main' : 'secondary.main'
                  }
                  color="white"
                  borderRadius={2}
                  p={2}
                  maxWidth="75%"
                >
                  <Typography variant="body1">
                    {message.content}
                  </Typography>
                </Box>
              </Box>
            ))}
            {/* This div will be used to scroll into view */}
            <div ref={messagesEndRef} />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Message"
              fullWidth
              variant="outlined"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button variant="contained" color="primary" onClick={sendMessage}>
              Send
            </Button>
          </Stack>
        </Stack>
        </Box>

      </Box>
    </ThemeProvider>
  );
}
