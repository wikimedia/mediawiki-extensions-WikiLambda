<template>
	<!--
		WikiLambda Vue component for the inline addition of ZTester objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div v-if="zobject.length">
		<wl-z-multilingual-string
			:zobject-id="labelsId"
			:readonly="true"
		></wl-z-multilingual-string>
		<wl-z-inline-tester-call
			v-if="call"
			:zobject-id="call.id"
		></wl-z-inline-tester-call>
		<wl-z-inline-tester-validation
			v-if="validator"
			:zobject-id="validator.id"
		></wl-z-inline-tester-validation>
		<div>
			<cdx-button @click="saveAdHocTester">
				{{ submitButtonLabel }}
			</cdx-button>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	typeUtils = require( '../../mixins/typeUtils.js' ),
	schemata = require( '../../mixins/schemata.js' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	ZInlineTesterCall = require( './ZInlineTesterCall.vue' ),
	ZInlineTesterValidation = require( './ZInlineTesterValidation.vue' ),
	ZMultilingualString = require( '../main-types/ZMultilingualString.vue' );

// @vue/component
module.exports = exports = {
	name: 'wl-z-tester-ad-hoc',
	components: {
		'wl-z-inline-tester-call': ZInlineTesterCall,
		'wl-z-inline-tester-validation': ZInlineTesterValidation,
		'wl-z-multilingual-string': ZMultilingualString,
		'cdx-button': CdxButton
	},
	mixins: [ typeUtils, schemata ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		zTesterListId: {
			type: Number,
			required: true
		}
	},
	computed: $.extend( mapGetters( [
		'getZObjectChildrenById',
		'getZObjectAsJsonById',
		'getNestedZObjectById'
	] ), {
		zobject: function () {
			return this.getZObjectChildrenById( this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_VALUE
			] ).id );
		},
		zobjectJson: function () {
			return this.getZObjectAsJsonById( this.zobjectId );
		},
		labelsId: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_LABEL
			] ).id;
		},
		zTesterList: function () {
			return this.getZObjectChildrenById( this.zTesterListId );
		},
		call: function () {
			return this.findKeyInArray( Constants.Z_TESTER_CALL, this.zobject );
		},
		validator: function () {
			return this.findKeyInArray( Constants.Z_TESTER_VALIDATION, this.zobject );
		},
		submitButtonLabel: function () {
			// Copied from ZObjectEditor; refactor, or use a different label for these?
			return mw.msg(
				mw.config.get( 'wgEditSubmitButtonLabelPublish' ) ?
					'wikilambda-publishnew' : 'wikilambda-savenew'
			);
		}
	} ),
	methods: $.extend( mapActions( [
		'saveNewTester'
	] ), {
		saveAdHocTester: function () {
			this.saveNewTester( {
				testerId: this.zobjectId,
				nextTesterIndex: this.zTesterList.length.toString(),
				parent: this.zTesterListId
			} );
		}
	} ),
	watch: {
		zobjectJson: function ( json, prevJson ) {
			if ( JSON.stringify( json ) !== JSON.stringify( prevJson ) ) {
				this.$store.dispatch( 'updateTesterLabel', { testerId: this.zobjectId } );
			}
		}
	}
};
</script>
