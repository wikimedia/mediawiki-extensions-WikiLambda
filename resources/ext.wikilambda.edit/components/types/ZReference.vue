<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zreference">
		<span v-if="viewmode">
			<a :href="'./ZObject:' + referenceValue">
				{{ referenceLabel }} ({{ referenceValue }})
			</a>
		</span>

		<z-object-selector
			v-else
			:viewmode="viewmode"
			:placeholder="$i18n( 'wikilambda-zobjectselector-label' )"
			:selected-id="referenceValue"
			:type="searchType"
			@input="setZReference"
		></z-object-selector>
	</div>
</template>

<script>
var Constants = require( './../../Constants.js' ),
	ZObjectSelector = require( './../ZObjectSelector.vue' ),
	typeUtils = require( './../../mixins/typeUtils.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	name: 'ZReference',
	components: {
		'z-object-selector': ZObjectSelector
	},
	props: {
		viewmode: {
			type: Boolean,
			required: true
		},
		zobjectId: {
			type: Number,
			required: true
		},
		searchType: {
			type: String,
			default: ''
		}
	},
	mixins: [ typeUtils ],
	computed: $.extend( {},
		mapGetters( [
			'getZObjectChildrenById',
			'getZkeyLabels'
		] ),
		{
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			referenceItem: function () {
				return this.findKeyInArray( Constants.Z_REFERENCE_ID, this.zobject );
			},
			referenceValue: function () {
				return this.referenceItem.value;
			},
			referenceLabel: function () {
				return this.getZkeyLabels[ this.referenceValue ];
			}
		}
	),
	methods: $.extend( {},
		mapActions( [
			'setZObjectValue',
			'fetchZKeys'
		] ),
		{
			/**
			 * Sets the value of a ZReference.
			 *
			 * @param {string} value
			 */
			setZReference: function ( value ) {
				var payload = {
					id: this.referenceItem.id,
					value: value
				};
				this.setZObjectValue( payload );
			}
		}
	),
	created: function () {
		if ( this.referenceValue ) {
			this.fetchZKeys( [ this.referenceValue ] );
		}
	}
};
</script>
