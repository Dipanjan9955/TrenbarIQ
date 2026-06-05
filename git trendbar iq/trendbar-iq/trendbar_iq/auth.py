from flask import Blueprint, request, jsonify, session, redirect, url_for, flash
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User
from flask_login import login_user, logout_user, current_user

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')
    user = User.query.filter_by(username=username).first()

    if user and check_password_hash(user.password_hash, password):
        login_user(user)
        flash('Login successful!')
        return redirect(url_for('index'))
    else:
        flash('Invalid username or password')
        return redirect(url_for('auth.login'))

@auth_bp.route('/register', methods=['POST'])
def register():
    username = request.form.get('username')
    email = request.form.get('email')
    password = request.form.get('password')

    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        flash('Username already exists')
        return redirect(url_for('auth.register'))

    existing_email = User.query.filter_by(email=email).first()
    if existing_email:
        flash('Email already registered')
        return redirect(url_for('auth.register'))

    new_user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password)
    )

    db.session.add(new_user)
    db.session.commit()
    login_user(new_user)
    flash('Registration successful!')
    return redirect(url_for('index'))

@auth_bp.route('/logout')
def logout():
    logout_user()
    flash('You have been logged out')
    return redirect(url_for('index'))