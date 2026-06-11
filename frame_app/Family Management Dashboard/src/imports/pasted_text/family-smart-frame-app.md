Continue building the Family Smart Frame app.

Current structure:
- The app is a 16:9 Apple-style family smart frame.
- Main page already contains five widgets:
  1. Family Calendar
  2. Photo Frame
  3. To-Do List
  4. Family Rewards
  5. Weather widget
- The four main widgets are clickable and should smoothly transition into their own detail pages.
- Please keep the current main page layout, visual style, and dynamic soft wave background.
- Do not redesign the whole system. Only complete the four module detail pages and the navigation interface.

Overall design requirements:
- Visual style: Apple-style, clean, calm, elegant, glassmorphism, soft shadows, rounded corners, subtle gradients.
- Animation style: natural, smooth, and fluid, but not overly complex.
- Use Framer Motion / Motion animations if available.
- Transitions should feel like a widget smoothly expands into its detail page.
- Maintain strict 16:9 aspect ratio.
- All detail pages should fit inside the 16:9 smart frame screen.
- Add a persistent bottom Home button on every detail page.
- The Home button should return to the main dashboard with a smooth transition.
- Home button style: minimal Apple-style floating pill/button, centered at the bottom, with a small home icon and label.
- Avoid clutter. This is for a family smart frame, so the UI should be readable from some distance.

Data synchronization requirement:
Calendar, To-Do List, and Family Rewards should use shared synchronized mock data.

Important logic:
- Calendar events and To-Do tasks should come from the same family schedule/task dataset.
- Completing a To-Do task should update the related task status.
- Completing tasks should increase the assigned family member’s reward points.
- Family Rewards ranking should automatically reflect the updated points.
- The main page widgets and detail pages should read from the same shared state/data source.
- Use local mock state for now. Leave clear interfaces/hooks/data structures so backend integration can be added later.

Please create/complete the following detail pages:

1. Calendar Detail Page
Create a standard family calendar page.
Features:
- Monthly calendar view.
- Show current month and year at the top.
- Allow previous/next month navigation.
- Highlight today.
- Mark dates that have events or tasks.
- When a user clicks a date, show the events/tasks for that day in a side panel or bottom panel.
- Events should include title, time, type, and assigned family member if relevant.
- Calendar should feel like Apple Calendar: simple, spacious, readable, soft colors.
- Use the same shared data used by the main Family Calendar widget and To-Do List.

Suggested layout:
- Top: month/year header + previous/next controls.
- Main area: calendar grid.
- Right side or bottom: selected date details.
- Bottom center: Home button.

2. To-Do List Detail Page
Create a family task management page.
Features:
- Show all upcoming family tasks.
- Group tasks by Today, Tomorrow, This Week, or by date.
- Each task should show:
  - title
  - due date/time
  - assigned family member
  - points gained after completion
  - completion status
- User can click/check a task to complete it.
- When completed:
  - update task status
  - add reward points to the assigned family member
  - update Family Rewards ranking automatically
- Keep it simple and readable. This is not a productivity app; it is a family smart frame.
- Use smooth micro-interactions when checking a task.

Suggested layout:
- Top: “Family To-Do List” title and summary, e.g. “3 upcoming”
- Main: task list cards
- Optional side summary: today’s tasks / completed count / points earned
- Bottom center: Home button.

3. Family Rewards Detail Page
Create a family rewards / ranking page.
Features:
- Show ranking leaderboard of family members.
- Display avatar, name, points, level, and rank.
- Highlight the top performer with a larger card.
- Show recent point changes or completed tasks if possible.
- Data should come from the same shared state as To-Do List.
- When tasks are completed in To-Do List, points and rankings should update here.
- Include several reward cards as placeholder redeemable rewards, such as:
  - Movie Night Pick
  - Extra Game Time
  - Choose Dinner
  - Weekend Treat
- The redeem section can be visual only for now, but leave an interface for future redeem logic.

Suggested layout:
- Top: “Family Rewards”
- Left/main: leaderboard
- Right/bottom: reward cards and recent achievements
- Bottom center: Home button.

4. Photo Frame Detail Page
Create an immersive photo frame page.
Features:
- When opened, show a large photo as the main focus.
- Photos should auto-switch every few seconds.
- User can manually go previous/next.
- Add smooth fade or slide transitions between photos.
- Include a small thumbnail filmstrip or mini gallery.
- The mini gallery should show the whole album content.
- Clicking a thumbnail should open that photo in the large view.
- Include pause/play control for automatic slideshow.
- Keep the photo page elegant and minimal, like Apple Photos.
- The photo should be displayed beautifully without heavy UI interference.

Suggested layout:
- Large centered photo area.
- Left/right subtle navigation arrows.
- Bottom: thumbnail strip / mini gallery.
- Bottom center or slightly above bottom: Home button.
- Small pause/play button near the thumbnail strip.

Implementation requirements:
- Use reusable components where possible:
  - ModuleDetailShell
  - HomeButton
  - CalendarDetailPage
  - TodoDetailPage
  - RewardsDetailPage
  - PhotoDetailPage
- Keep the code modular and easy to connect to backend later.
- Create a shared mock data file or shared state object:
  - familyMembers
  - calendarEvents
  - tasks
  - rewards
  - photos
- Leave clear comments like:
  // TODO: replace mock data with backend API
  // TODO: connect redeem action to backend
  // TODO: sync calendar/tasks with cloud database

Animation requirements:
- Main widget click → detail page should feel like expansion.
- Detail page close/home → return to main page should feel like shrinking or fading back.
- Use spring or ease-out transitions.
- Avoid exaggerated bouncing.
- No complex 3D animation.
- The UI should feel calm, premium, and suitable for a family home device.

Please implement the four module detail pages now, while preserving the existing main dashboard.