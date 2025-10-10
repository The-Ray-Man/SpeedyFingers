import { Box, Text } from "@chakra-ui/react";

interface ShapeWrapperProps {
  text: string;
}

export default function ShapeWrapper({ text }: ShapeWrapperProps) {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="white"
      p={8}
      borderRadius="lg"
      boxShadow="md"
      minW="300px"
      minH="150px"
    >
      <Text
        fontSize="4xl"
        fontWeight="bold"
        color="red.500"
        textAlign="center"
        lineHeight="1.2"
      >
        {text}
      </Text>
    </Box>
  );
}
