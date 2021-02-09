<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div :class="classZObject">
		<!-- Depending on the type, it will render a different component -->
		<z-string
			v-if="type === Constants.Z_STRING || type === Constants.Z_REFERENCE"
			:value="zobject"
			:viewmode="viewmode"
			@input="setZString"
		></z-string>

		<z-multilingual-string
			v-else-if="type === Constants.Z_MULTILINGUALSTRING"
			:zobject="zobject"
			:viewmode="viewmode"
			@delete-lang="deleteZMonolingualString"
			@add-lang="addZMonolingualString"
			@change="setZMonolingualString"
		></z-multilingual-string>

		<z-list
			v-else-if="type === Constants.Z_LIST"
			:zobject="zobject"
			:viewmode="viewmode"
			@add-item="addZListItem"
			@delete-item="deleteZListItem"
			@change-item="setZListItem"
		></z-list>

		<z-object-generic
			v-else
			:zobject="zobject"
			:persistent="persistent"
			:viewmode="viewmode"
			@change-key="setZObjectKey"
			@change-type="setZObjectType"
		></z-object-generic>
	</div>
</template>

<script>
var Constants = require( '../Constants.js' ),
	typeUtils = require( '../mixins/typeUtils.js' ),
	ZObjectGeneric = require( './ZObjectGeneric.vue' ),
	ZList = require( './types/ZList.vue' ),
	ZMultilingualString = require( './types/ZMultilingualString.vue' ),
	ZString = require( './types/ZString.vue' );

module.exports = {
	name: 'ZObject',
	components: {
		'z-list': ZList,
		'z-multilingual-string': ZMultilingualString,
		'z-string': ZString,
		'z-object-generic': ZObjectGeneric
	},
	mixins: [ typeUtils ],
	props: {
		zobject: {
			type: [ Object, Array, String ],
			default: function () {
				return {};
			}
		},
		persistent: {
			type: Boolean,
			required: true
		},
		viewmode: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			Constants: Constants
		};
	},
	computed: {
		type: function () {
			return this.getZObjectType( this.zobject );
		},
		isInlineComponent: function () {
			return (
				( this.type === Constants.Z_STRING ) ||
				( this.type === Constants.Z_REFERENCE )
			);
		},
		classZObject: function () {
			return {
				'ext-wikilambda-zobject': true,
				'ext-wikilambda-zobject-inline': this.isInlineComponent
			};
		}
	},
	methods: {
		// Handlers for ZString

		/**
		 * Fires a change event with the new string. This is necessary when
		 * zobject is of String type, as this ZObject is unable to mutate
		 * directly its value. The parent ZObject will capture this event and
		 * mutate the property where the string is saved.
		 *
		 * @param {string} value
		 * @fires change
		 */
		setZString: function ( value ) {
			this.$emit( 'change', value );
		},

		// Handlers for ZMultilingualString events

		/**
		 * Removes a language entry from a Multilingual string.
		 *
		 * @param {number} index
		 */
		deleteZMonolingualString: function ( index ) {
			if ( this.zobject[ Constants.Z_MULTILINGUALSTRING_VALUE ] ) {
				this.zobject[ Constants.Z_MULTILINGUALSTRING_VALUE ].splice( index, 1 );
			}
		},

		/**
		 * Adds a new Monolingual String to the Multilingual String
		 * values array.
		 *
		 * @param {string} lang
		 */
		addZMonolingualString: function ( lang ) {
			var monolingualString = {};

			// Create new ZMonolingual String
			monolingualString[ Constants.Z_OBJECT_TYPE ] = Constants.Z_MONOLINGUALSTRING;
			monolingualString[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] = lang;
			monolingualString[ Constants.Z_MONOLINGUALSTRING_VALUE ] = '';

			// Add it to the value array in the ZMultilingual String
			if ( !this.zobject[ Constants.Z_MULTILINGUALSTRING_VALUE ] ) {
				this.$set( this.zobject, Constants.Z_MULTILINGUALSTRING_VALUE, [] );
			}
			this.zobject[ Constants.Z_MULTILINGUALSTRING_VALUE ].push( monolingualString );
		},

		/**
		 * Sets the value of an existing Monolingual String from the Multilingual
		 * String values array.
		 *
		 * @param {Object} item
		 */
		setZMonolingualString: function ( item ) {
			if ( this.zobject[ Constants.Z_MULTILINGUALSTRING_VALUE ] ) {
				this.$set(
					this.zobject[ Constants.Z_MULTILINGUALSTRING_VALUE ][ item.index ],
					Constants.Z_MONOLINGUALSTRING_VALUE,
					item.value
				);
			}
		},

		// Handlers for ZObjectGeneric events

		/**
		 * Mutates the value of a given key in this ZObject.
		 *
		 * @param {Object} item
		 */
		setZObjectKey: function ( item ) {
			this.$set( this.zobject, item.key, item.value );
		},

		/**
		 * Changes the type (the value of the Z1K1 key) of this ZObject.
		 *
		 * @param {Object} newType
		 */
		setZObjectType: function ( newType ) {
			this.$set( this.zobject, Constants.Z_OBJECT_TYPE, newType );
		},

		// Handlers for ZList events

		/**
		 * Adds a new item into the list represented by this ZObject.
		 *
		 * @param {Object|Array|string} value
		 */
		addZListItem: function ( value ) {
			if ( Array.isArray( this.zobject ) ) {
				this.zobject.push( value );
			}
		},

		/**
		 * Deletes an item from the list represented by this ZObject.
		 *
		 * @param {number} index
		 */
		deleteZListItem: function ( index ) {
			if ( Array.isArray( this.zobject ) ) {
				this.zobject.splice( index, 1 );
			}
		},

		/**
		 * Sets the value for a given item of the list represented
		 * by this ZObject.
		 *
		 * @param {Object} item
		 */
		setZListItem: function ( item ) {
			if ( Array.isArray( this.zobject ) ) {
				this.$set( this.zobject, item.index, item.value );
			}
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-zobject {
	display: block;

	.ext-wikilambda-zobject-inline {
		display: inline-block;
	}
}
</style>
