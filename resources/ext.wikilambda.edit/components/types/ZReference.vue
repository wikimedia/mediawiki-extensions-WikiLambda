<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zreference">
		<span v-if="viewmode">
			<a :href="'./ZObject:' + referenceId">
				{{ referenceLabel }} ({{ referenceId }})
			</a>
		</span>

		<z-object-selector
			v-else
			:viewmode="viewmode"
			:placeholder="$i18n( 'wikilambda-zobjectselector-label' )"
			:selected-id="referenceId"
			@input="setReferenceId"
		></z-object-selector>
	</div>
</template>

<script>
var Constants = require( './../../Constants.js' ),
	ZObjectSelector = require( './../ZObjectSelector.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapState = require( 'vuex' ).mapState;

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
		zobject: {
			type: [ Object, String ],
			default: ''
		}
	},
	computed: $.extend( {},
		mapState( [ 'zLangs', 'zKeyLabels' ] ),
		{
			referenceId: function () {
				if ( typeof this.zobject === 'string' ) {
					return this.zobject;
				} else {
					return this.zobject[ Constants.Z_REFERENCE_ID ];
				}
			},
			referenceLabel: function () {
				return this.zKeyLabels[ this.referenceId ];
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'fetchZKeys' ] ),
		{
			/**
			 * Fires the `input` event with the value of the selected ZObject
			 *
			 * @param {string} event
			 * @fires input
			 */
			setReferenceId: function ( event ) {
				this.$emit( 'input', event );
			}
		}
	),
	created: function () {
		if ( this.referenceId ) {
			this.fetchZKeys( {
				zids: [ this.referenceId ],
				zlangs: this.zLangs
			} );
		}
		if ( !this.viewmode && ( typeof this.zobject === 'string' ) ) {
			this.$emit( 'input', this.zobject );
		}
	}
};
</script>
