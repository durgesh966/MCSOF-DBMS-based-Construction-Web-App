const multer = require('multer');
const csrf = require('csurf');
const bcrypt = require('bcrypt');
const debug = require('debug')('app:admin');

const upload = require('../../controllers/multer');
const { handleError } = require('../../middleware/error');

const Admin = require('../../../DB/models/Admin');
const Booking = require('../../../DB/models/Booking');
const ContectUs = require('../../../DB/models/ContectUs');
const NewJoiningApply = require('../../../DB/models/NewJoiningApply');
const Service = require('../../../DB/models/Service');
const WorkDetails = require('../../../DB/models/WorkDetails');
const Worker = require('../../../DB/models/Worker');

// Login and logout routes

const loginPage = (req, res) => {
    res.render('./Admin/adLogin', {
        message: req.query.message,
        error: req.query.error,
        success: req.query.success
    });
};

const signupPage = (req, res) => {
    res.render('./Admin/adSignup', {
        message: req.query.message,
        error: req.query.error,
        success: req.query.success
    });
};

const adminDashboard = async (req, res) => {
    try {
        const admin_data = await Admin.find().lean();
        res.render('./Admin/adDashboard', {
            admin_data,
            message: req.query.message,
            error: req.query.error,
            success: req.query.success
        });
    } catch (err) {
        debug('Error fetching admin data:', err);
    }
};

const adminSignup = async (req, res) => {
    try {
        const { first_name, last_name, email, password, phone_number } = req.body;
        if (!first_name || !last_name || !email || !password || !phone_number) {
            return res.status(400).redirect("/adSignup?error=please+fill+all+input+fields");
        }
        const emailIdChack = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailIdChack.test(email)) {
            return res.status(400).redirect("/adSignup?error=invalid+email+format");
        }
        const phoneNumberChack = /^[0-9]{10}$/;
        if (!phoneNumberChack.test(phone_number)) {
            return res.status(400).redirect("/adSignup?error=invalid+phone+number+format");
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new Admin({
            first_name,
            last_name,
            email,
            phone_number,
            password: hashedPassword,
        });
        await newAdmin.save();
        return res.status(200).redirect("/?success=User+Registered+Successfully.+Please+Login");
    } catch (error) {
        debug('Error during admin signup:', error);
        return res.status(500).redirect("/adSignup?error=internal+server+error");
    }
};

const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).redirect("/?error=Email+and+password+are+required");
        }
        const user = await Admin.findOne({ email });
        if (!user) {
            return res.status(404).redirect("/?error=Invalid+email+or+password");
        }
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            return res.status(200).redirect("/adDashboard?success=Login+successful");
        } else {
            await bcrypt.compare('not-a-valid-password', user.password);
            return res.status(401).redirect("/?error=Invalid+email+or+password");
        }
    } catch (error) {
        console.error('Error during admin login:', error);
        return res.status(500).redirect("/?error=Error+occurred+during+login");
    }
};

// Booking data routes

const bookWorkData = async (req, res) => {
    try {
        const bookings = await Booking.find().lean();
        res.render('./Admin/Booking/showBooking', {
            bookings: bookings,
            message: req.query.message || '',
            error: req.query.error || '',
            success: req.query.success || ''
        });
    } catch (error) {
        console.error("Error in bookWorkData route:", error);
        res.status(500).send("Internal Server Error");
    }
};

const bookedWorkFullData = async (req, res) => {
    try {
        const userId = req.params.id;
        const bookingFullData = await Booking.findById(userId).lean();

        if (!bookingFullData) {
            return res.status(404).send({ error: 'Booking not found' });
        }
        res.render('./Admin/Booking/full_booking_details', {
            booking_full_data: bookingFullData,
            message: req.query.message,
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Error fetching booking data:', error);
        res.status(500).send({ error: 'Failed to Get full booking data' });
    }
};

const deleteBookData = async (req, res) => {
    try {
        const delete_data = await Booking.findByIdAndDelete(req.params.id);
        if (delete_data) {
            res.status(200).redirect("/booking_work_data?success=Booking+deleted+successfully");
        } else {
            res.status(404).send({ message: 'Booking not found' });
        }
    } catch (error) {
        handleError(error, req, res, 'Error occurred while deleting booking data');
    }
};

// Contacts routes

const showAllContacts = async (req, res) => {
    try {
        const all_contacts = await ContectUs.find().lean();
        res.render('./Admin/contact/showContact', {
            all_contacts,
            message: req.query.message,
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        handleError(error, req, res, 'Failed to fetch all contacts');
    }
};

const searchContact = async (req, res) => {
    try {
        let query = req.query.query || '';
        if (typeof query !== 'string') {
            return res.status(400).redirect("/show_all_contacts?error=Invalid+search+query");
        }
        if (query.length > 50) {
            return res.status(400).redirect("/show_all_contacts?error=Search+query+too+long");
        }
        query = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const contacts = await ContectUs.find({
            $or: [
                { full_name: { $regex: new RegExp(query, 'i') } },
                { email: { $regex: new RegExp(query, 'i') } },
            ],
        }).lean();
        if (!contacts.length) {
            return res.status(500).redirect("/show_all_contacts?error=Search+result+not+found");
        }
        res.render('./Admin/contact/searchResult', { contacts, query, success: 'Successfully searched contacts' });
    } catch (error) {
        console.error('Error searching contacts:', error);
        res.status(500).json({ error: 'Failed to search contacts' });
    }
};

const deleteContacts = async (req, res) => {
    try {
        await ContectUs.findByIdAndDelete(req.params.id);
        res.redirect('/show_all_contacts?success=Contact+Delete+Successfully');
    } catch (error) {
        handleError(error, req, res, 'Error occurred while deleting contacts');
    }
};

// New employee apply details routes

const newEmployeeApplyData = async (req, res) => {
    try {
        const new_employee_data = await NewJoiningApply.find().lean();
        res.render('./Admin/newEmployeeApplication/newEmployee', {
            new_employee_data,
            message: req.query.message,
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        handleError(error, req, res, 'Failed to fetch new employee application data');
    }
};

const newEmployeeApplyFullData = async (req, res) => {
    try {
        const new_Employee_full_data = await NewJoiningApply.findById(req.params.id).lean();
        res.render('./Admin/newEmployeeApplication/newEmployee_full_Profile', { new_Employee_full_data });
    } catch (error) {
        handleError(error, req, res, 'Failed to fetch full new employee data');
    }
};

const deleteEmployeeApplyData = async (req, res) => {
    try {
        await NewJoiningApply.findByIdAndDelete(req.params.id);
        console.log(NewJoiningApply);
        res.redirect('/new_employee_details?success=User+Data+Deleted');
    } catch (error) {
        handleError(error, req, res, 'Error occurred while deleting new employee application data');
    }
};

// Add services routes

const addServices = (req, res) => {
    res.render('./Admin/service/addService', {
        message: req.query.message,
        error: req.query.error,
        success: req.query.success
    });
};

const uploadNewServices = async (req, res) => {
    try {
        upload.single('image')(req, res, async (err) => {
            if (err instanceof multer.MulterError) {
                debug('Multer Error:', err);
                return res.redirect('/add-services?error=Multer+Produced+Error');
            } else if (err) {
                debug('Unknown Error:', err);
                return res.redirect('/add-services?error=Unknown+error');
            }
            const { titlename, description } = req.body;
            const image = req.file ? req.file.filename : null;
            debug(titlename, description, image);
            if (!titlename || !description || !image) {
                return res.redirect("/add-services?error=Fill+all+input+fields");
            }
            await Service.create({
                titlename,
                description,
                image
            });
            return res.redirect('/add-services?success=Service+added+successfully');
        });
    } catch (error) {
        debug('Internal Server Error:', error);
        return res.redirect('/add-services?error=Internal+Server+Error');
    }
};

// Add and update work details routes

const showWorkData = async (req, res) => {
    try {
        const show_Work_details = await WorkDetails.find().lean();
        res.render('./Admin/service/add_Work_Details', {
            show_Work_details,
            message: req.query.message,
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        handleError(error, req, res, 'Failed to fetch work details');
    }
};

const addWorkData = async (req, res) => {
    try {
        const { new_task, task_completed, team_members, customers } = req.body;
        await WorkDetails.create({
            new_task,
            task_completed,
            team_members,
            customers
        });
        res.redirect('/add_working_details?success=Data+added+successfully');
    } catch (error) {
        console.error('Failed to add working details:', error);
        res.status(500).send('Failed to add working details');
    }
};

const updateWorkData = async (req, res) => {
    try {
        const { docID, update_new_task, update_task_completed, update_team_members, update_customers } = req.body;
        if (!update_new_task || !update_task_completed || !update_team_members || !update_customers) {
            return res.redirect('/add_working_details?error=Error+during+submission');
        }
        const updateData = {
            new_task: update_new_task,
            task_completed: update_task_completed,
            team_members: update_team_members,
            customers: update_customers
        };
        const updatedWorkDetails = await WorkDetails.findByIdAndUpdate(docID, updateData, { new: true });
        if (!updatedWorkDetails) {
            return res.redirect('/add_working_details?error=Data+updating+faild');
        }
        return res.redirect('/add_working_details?success=Data+Update+Successfull');
    } catch (error) {
        console.error('Error adding or updating work details:', error);
        return res.redirect('/adDashboard?error=Error+during+subbmission');
    }
};

// Add employee routes

const registerWorker = (req, res) => {
    res.render('./Admin/addEmployee/registration_worker', {
        message: req.query.message,
        error: req.query.error,
        success: req.query.success
    });
};

const registerWorkerFormSubmit = async (req, res) => {
    try {
        upload.single('image')(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                throw new Error('File upload error: ' + err.message);
            } else if (err) {
                throw err;
            }

            const { first_name, last_name, gender, email, phone_number, country, state, city, post_code, service, description, charge, task_completed } = req.body;
            const image = req.file ? req.file.filename : null;

            await Worker.create({
                image,
                first_name,
                last_name,
                gender,
                email,
                phone_number,
                country,
                state,
                city,
                post_code,
                service,
                description,
                charge,
                task_completed
            });
            return res.redirect('/registration_worker?success=Form+submitted+successfully');
        });
    } catch (error) {
        let errorMessage = 'Internal Server Error. Please fill in all input fields.';
        if (error.name === 'MulterError') {
            errorMessage = 'File upload error: ' + error.message;
        } else if (error.name === 'ValidationError') {
            errorMessage = 'Validation Error. Please check your input data.';
        } else if (error.code === 11000) {
            errorMessage = 'Duplicate entry. The provided email or phone number is already registered.';
        }
        return res.redirect('/registration_worker');
    }
};


module.exports = {
    loginPage,
    signupPage,
    adminDashboard,
    adminSignup,
    adminLogin,
    bookWorkData,
    bookedWorkFullData,
    deleteBookData,
    showAllContacts,
    searchContact,
    deleteContacts,
    newEmployeeApplyData,
    newEmployeeApplyFullData,
    deleteEmployeeApplyData,
    addServices,
    uploadNewServices,
    showWorkData,
    addWorkData,
    updateWorkData,
    registerWorker,
    registerWorkerFormSubmit
};
