import React from 'react';
import Dashboard from '../components/Dashboard/Dashboard';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import './styles.css';

const DashboardPage = () => {
    return (
        <div className="page-wrapper">
            <Navbar />
            <main className="main-content">
                <Dashboard />
            </main>
            <Footer />
        </div>
    );
};

export default DashboardPage;