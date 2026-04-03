export function answeredCount(answers) {
  return Object.values(answers || {}).filter((answer: any) => answer?.text).length;
}
