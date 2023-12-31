const validEditedUsername = (username) => {
    if (!username) return null;
    if (typeof username !== 'string') throw "username must be a string";
    username = username.trim();
    if (username.length === 0) throw "username must be a non-empty string";
    if (username.length < 2 || username.length > 25) throw "name must be between 2 and 25 characters";
    if (!/^[a-zA-Z0-9]+$/.test(username)) throw "username must be a valid string with no spaces";
    return username;
  }
  
const validEditedPassword = (password) => {
    if (!password) return null;
    if (typeof password !== 'string') throw "Password must be a string";
    if (password.trim().length === 0) throw "Password must be a non-empty string";
    password = password.trim();
    if (password.length < 8) throw "Password must be between 8 and 20 characters";
    if (password.includes(" ")) throw "Password cannot contain spaces";
    if (!/[^a-zA-Z0-9]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) 
        throw "Password must contain at least one uppercase character, one number and one special character";
    return password;
  };

let successid = document.getElementById('success');

// stuff for error
// for edit profile page  
let editForm = document.getElementById("editForm");
let error = document.getElementById("error");
if(editForm){
    editForm.addEventListener("submit", (event) => {
        event.preventDefault();

        successid.textContent = "";
        error.classList.add("hidden")
        try{
            let username = document.getElementById("username").value;
            let oldPassword = document.getElementById("oldPassword").value;
            let newPassword = document.getElementById("newPassword").value;
            let lastfmUsername = document.getElementById("lastfmUsername").value;
            let confirmPassword = document.getElementById("confirmPassword").value;
            username = validEditedUsername(username);
            oldPassword = validEditedPassword(oldPassword);
            newPassword = validEditedPassword(newPassword);
            confirmPassword = validEditedPassword(confirmPassword);
            lastfmUsername = validEditedUsername(lastfmUsername);
            
            if(username === null && lastfmUsername === null && oldPassword === null && newPassword === null && confirmPassword === null)
                throw "No changes made";
            if(
                ((newPassword === null || confirmPassword === null) && oldPassword !== null) || 
                ((newPassword !== null || confirmPassword !== null) && oldPassword === null)) 
                throw "Enter old and new password to change password";
            successid.textContent = "Loading...";
            editForm.submit();
        }
        catch(e){
            event.preventDefault();
            error.classList.remove("hidden");
            error.textContent = e;
        }
    })
}

//for delete posts page