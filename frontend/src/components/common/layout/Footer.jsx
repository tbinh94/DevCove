import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin, Mail, Heart } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.topSection}>
          <div className={styles.brandSection}>
            <Link to="/" className={styles.logo}>
              <span className={styles.logoText}>DevCove</span>
            </Link>
            <p className={styles.brandDescription}>
              The ultimate developer community. Connect, share knowledge, and build the future together. Find the answers to your coding challenges and collaborate with experts worldwide.
            </p>
            <div className={styles.socialLinks}>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="GitHub">
                <Github size={20} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="https://www.linkedin.com/in/ca-diep-thanh-binh" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="LinkedIn">
                <Linkedin size={20} />
              </a>
              <a href="mailto:contact@devcove.com" className={styles.socialIcon} aria-label="Email">
                <Mail size={20} />
              </a>
            </div>
          </div>

          <div className={styles.linksSection}>
            <div className={styles.linkColumn}>
              <h3 className={styles.columnTitle}>Platform</h3>
              <ul className={styles.linkList}>
                <li><Link to="/explore">Explore</Link></li>
                <li><Link to="/communities">Communities</Link></li>
                <li><Link to="/challenges">Challenges</Link></li>
                <li><Link to="/leaderboard">Leaderboard</Link></li>
              </ul>
            </div>

            <div className={styles.linkColumn}>
              <h3 className={styles.columnTitle}>Resources</h3>
              <ul className={styles.linkList}>
                <li><Link to="/docs">Documentation</Link></li>
                <li><Link to="/blog">Blog</Link></li>
                <li><Link to="/api">API Reference</Link></li>
                <li><Link to="/guidelines">Community Guidelines</Link></li>
              </ul>
            </div>

            <div className={styles.linkColumn}>
              <h3 className={styles.columnTitle}>Company</h3>
              <ul className={styles.linkList}>
                <li><Link to="/about">About Us</Link></li>
                <li><Link to="/careers">Careers</Link></li>
                <li><Link to="/privacy">Privacy Policy</Link></li>
                <li><Link to="/terms">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className={styles.bottomSection}>
          <div className={styles.copyright}>
            © {new Date().getFullYear()} DevCove. All rights reserved.
          </div>
          <div className={styles.developer}>
            Developed with <Heart size={14} className={styles.heartIcon} /> by
            <a href="https://www.linkedin.com/in/ca-diep-thanh-binh" target="_blank" rel="noopener noreferrer" className={styles.devLink}>
              Thanh Binh
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}