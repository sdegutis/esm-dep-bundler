import { React } from '/app/deps.js';

export default function useCount() {
  const [count, setCount] = React.useState(0);
  const increase = () => setCount(oldCount => oldCount + 1);
  return [count, increase];
}
