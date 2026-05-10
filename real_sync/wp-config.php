<?php
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the installation.
 * You don't have to use the website, you can copy this file to "wp-config.php"
 * and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * Database settings
 * * Secret keys
 * * Database table prefix
 * * ABSPATH
 *
 * @link https://developer.wordpress.org/advanced-administration/wordpress/wp-config/
 *
 * @package WordPress
 */

// ** Database settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', '_122_51_223_46' );

/** Database username */
define( 'DB_USER', '_122_51_223_46' );

/** Database password */
define( 'DB_PASSWORD', 'Yaoxiuning190' );

/** Database hostname */
define( 'DB_HOST', 'localhost' );

/** Database charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8mb4' );

/** The database collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );

/**#@+
 * Authentication unique keys and salts.
 *
 * Change these to different unique phrases! You can generate these using
 * the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}.
 *
 * You can change these at any point in time to invalidate all existing cookies.
 * This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define( 'AUTH_KEY',         '[dIpzTX9hc<Vf($EJ?YEjij;P!_Z3fjlUK8AE.IQL9UJ3*wtbl<sL$l&,ttJgF-y' );
define( 'SECURE_AUTH_KEY',  'xnH|>WY0yb6h7G3@m]ELSzv!zE W!nk5?p}@/(@pYrH]Fh]3M#@;|n1,d.o~u>hq' );
define( 'LOGGED_IN_KEY',    '-6z{~`L^B5z1:8mec.%,p=qD(;n-3EHMFSF375d_e4Z7hs_)dNZlB#9@xD1BHZ4-' );
define( 'NONCE_KEY',        'KB+Cc%`^r@G$bp_77QL_<I91&Q+E@f5z%^FV_hVl`6SQ[Y{um1)Nu0;.b94F._s9' );
define( 'AUTH_SALT',        '*vGmzk[ c?=yJI4h<#~3On1.yPF7=]F_tc?%Qh|YQXD~pbsihKI;(zb9ew|-//oO' );
define( 'SECURE_AUTH_SALT', 'wD04VizW5-@1p8_ b5*8y)*7b8re1$)ZueF4<2a)4ik<r-]qwY4/G}Zfag<*ubOT' );
define( 'LOGGED_IN_SALT',   '>*v!LY8!5P:tOU<ikv{Wl;6`Jz lcrBM/c)sN8x%pg@(a)DGm$0ZK]wZ`I*GoJki' );
define( 'NONCE_SALT',       '-(*j]&?@WeC*9gjol _+}`ZfsFjH<^GlS>>NQM?C6I*y,%tU]>tEn_i=4yeuBA#q' );

/**#@-*/

/**
 * WordPress database table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 *
 * At the installation time, database tables are created with the specified prefix.
 * Changing this value after WordPress is installed will make your site think
 * it has not been installed.
 *
 * @link https://developer.wordpress.org/advanced-administration/wordpress/wp-config/#table-prefix
 */
$table_prefix = 'wp_';

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the documentation.
 *
 * @link https://developer.wordpress.org/advanced-administration/debug/debug-wordpress/
 */
define( 'WP_DEBUG', false );
define( 'DISABLE_WP_CRON', true );
/* Cookie settings for Chrome SameSite compatibility */
define("COOKIE_DOMAIN", false);
define("ADMIN_COOKIE_PATH", "/");
define("COOKIEPATH", "/");
define("SITECOOKIEPATH", "/");

/* Add any custom values between this line and the "stop editing" line. */



/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';
