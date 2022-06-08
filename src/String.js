export const is_letters = (str) => {
  return str.match("^[a-zA-Z]+$");
}

export const shuffle_string = (str) => {
  const str_arr = str.split('')
  for (let i = str_arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = str_arr[i];
    str_arr[i] = str_arr[j];
    str_arr[j] = temp;
  }
  return str_arr.join('')
}

export const char_array_to_int_array = (arr) => {
  let int_arr = []
  const has_invalid_index = arr.some(ii => {
    ii = parseInt(ii)
    int_arr.push(ii)
    return isNaN(ii)
  })
  return has_invalid_index ? null : int_arr
}

