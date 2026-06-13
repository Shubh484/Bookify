#!/bin/bash

# Ensure we have a room ID to test with
ROOM_ID=$(curl -s http://localhost:3000/api/rooms | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$ROOM_ID" ]; then
  echo "Error: Could not fetch a room ID from the API. Make sure the server is running."
  exit 1
fi

echo "Testing concurrency on room: $ROOM_ID"

DATE="2026-06-20"
START="14:00"
END="14:30"

# Fire two simultaneous booking requests for the same slot
echo "Sending two parallel requests for slot $START to $END..."

curl -s -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"roomId":"'"$ROOM_ID"'","date":"'"$DATE"'","startTime":"'"$START"'","endTime":"'"$END"'","bookedBy":"Alice","email":"alice@test.com","title":"Meeting A"}' &
PID1=$!

curl -s -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"roomId":"'"$ROOM_ID"'","date":"'"$DATE"'","startTime":"'"$START"'","endTime":"'"$END"'","bookedBy":"Bob","email":"bob@test.com","title":"Meeting B"}' &
PID2=$!

wait $PID1
wait $PID2

echo -e "\nRequests completed. One should be 201 (success), one should be 409 (conflict)."
