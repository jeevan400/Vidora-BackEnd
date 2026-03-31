import { Router } from "express";
import { addToHistory, deleteMeetingHistory, getUserHistory, login, register } from "../controller/user.controller.js";


const router = Router();

router.route("/login").post(login)
router.route("/register").post(register)
router.route("/add_to_activity").post(addToHistory)
router.route("/get_all_activity").get(getUserHistory)

router.route("/delete-meeting/:id").delete(deleteMeetingHistory)

export default router;